import {
  type MediaType,
  type NewSave,
  type NewSyncAction,
  type NewTask,
  type Save,
  type SaveFile,
  type Source,
  type SyncAction,
  saves,
  syncActions,
  tasks,
} from "@pond/schema/db";
import type { CaptureAuthor, RawJson } from "@pond/schema/raw";
import { and, eq, inArray, isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { broadcastSyncAction } from "../executor";
import { persistSave } from "../persist-save";
import { isSourceConnected } from "../refresh/scrape-window";
import { classifyUrlToSource } from "./extractors";
import { UnsupportedError } from "./extractors/errors";
import { kickReconciler } from "./reconciler";
import { maxAttemptsFor, planOps } from "./specs";
import { sourceIdFromUrl } from "./url";
import {
  CAPTURE_TWEET_VERSION,
  readCaptureTweetVersion,
  runCaptureTweet,
  TWEET_SCREENSHOT_DARK_KIND,
  TWEET_SCREENSHOT_LIGHT_KIND,
} from "./workers/capture-tweet";
import { runFetchBlobs } from "./workers/fetch-blobs";

export interface EnqueueResult {
  id: string;
  created: boolean;
  // Set when a previously-failed save was reset with a fresh seed.
  reseeded?: boolean;
}

interface EnqueueSeed {
  rawJson: RawJson;
  title?: string | null;
  description?: string | null;
  author?: string | null;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  publishedAt?: Date | null;
  lang?: string | null;
}

export interface EnqueueOptions {
  trigger?: string;
  force?: boolean;
  // Pre-extracted capture data; lets harvest_metadata skip its scrape via isFreshHarvest().
  seed?: EnqueueSeed;
}

export async function enqueueSaveByUrl(
  rawUrl: string,
  opts: EnqueueOptions = {},
): Promise<EnqueueResult> {
  const normalizedUrl = normalizeUrl(rawUrl);
  const classification = classifyUrlToSource(normalizedUrl);
  if (!classification.source) {
    throw new UnsupportedError(`no extractor matches url: ${rawUrl}`);
  }
  const source = classification.source;
  const sourceId = sourceIdFromUrl(source, normalizedUrl);
  if (!sourceId) {
    throw new UnsupportedError(
      `could not derive sourceId for ${normalizedUrl}`,
    );
  }

  const db = await getDb();
  const existing = await db
    .select()
    .from(saves)
    .where(and(eq(saves.source, source), eq(saves.sourceId, sourceId)));
  const current = existing[0];

  if (current) {
    // Failed save + seed = recovery: reset tasks to pending and write the seed.
    if (opts.seed && current.status === "failed") {
      await resetTasksForSave(
        current.id,
        opts.trigger ?? "enqueue:reseed-failed",
      );
      await applySeedToExistingSave(current.id, opts.seed);
      kickReconciler();
      log.info("[pond pipeline:enqueue] reseeded failed save", {
        id: current.id,
        source,
        trigger: opts.trigger,
      });
      return { id: current.id, created: false, reseeded: true };
    }
    if (opts.force) {
      await resetTasksForSave(current.id, opts.trigger ?? "enqueue:force");
    } else if (opts.seed) {
      // Additive enrichment: merge new seed fields into rawJson without overwriting existing.
      const merge = mergeSeedIntoExistingSave(current, opts.seed);
      if (merge.changed) {
        await persistEnrichment(current.id, merge);
        if (merge.didFillAvatarUrl) {
          await rependFetchAvatar(current.id);
        }
        log.info("[pond pipeline:enqueue] enriched existing save", {
          id: current.id,
          source,
          trigger: opts.trigger,
          filled: merge.filled,
        });
      }
    }
    kickReconciler();
    log.info("[pond pipeline:enqueue] existing save", {
      id: current.id,
      source,
      trigger: opts.trigger,
      force: opts.force === true,
    });
    return { id: current.id, created: false };
  }

  const id = ulid();
  const now = new Date();
  const insertValues: NewSave = {
    id,
    source,
    sourceId,
    url: normalizedUrl,
    status: "ingesting",
    ingestStartedAt: now,
    tags: [],
    files: [],
    coverIndex: 0,
    savedAt: now,
    createdAt: now,
    ...(opts.seed ? seedToInsertColumns(opts.seed) : {}),
  };

  const ops = planOps(source);
  const taskRows: NewTask[] = ops.map((op) => ({
    id: ulid(),
    saveId: id,
    op,
    status: "pending",
    attempts: 0,
    maxAttempts: maxAttemptsFor(op),
    nextRunAt: now,
    createdAt: now,
    updatedAt: now,
  }));

  // Save row, task rows, and sync_action in one transaction so a crash can't
  // leave a half-ingested save (and one fsync instead of three).
  const insertedAction = db.transaction((tx) => {
    tx.insert(saves).values(insertValues).run();
    tx.insert(tasks).values(taskRows).run();
    return tx
      .insert(syncActions)
      .values({
        modelName: "save",
        modelId: id,
        action: "I",
        data: insertValues as unknown,
        actor: opts.trigger?.startsWith("user:") ? "user" : "system",
        actorReason: opts.trigger ?? "pipeline:enqueue",
        batchId: ulid(),
      })
      .returning()
      .all()[0];
  });
  if (insertedAction) broadcastSyncAction(insertedAction);

  log.info("[pond pipeline:enqueue] created save", {
    id,
    source,
    sourceId,
    trigger: opts.trigger,
  });
  kickReconciler();
  return { id, created: true };
}

export interface BulkEnqueueItem {
  url: string;
  seed?: EnqueueSeed;
}

export interface BulkEnqueueResult {
  created: number;
  existing: number;
  failed: number;
}

// SQLite caps bound parameters per statement (~999 on the default build). Keep
// each multi-row INSERT comfortably under that across the widest row.
const BULK_INSERT_CHUNK = 100;

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

// Batch-enqueue many URLs from a single harvest. New saves are inserted with
// chunked multi-row INSERTs (far cheaper than per-URL round-trips at sync
// scale); already-known URLs fall back to the per-item path to keep reseed
// semantics. Every created save still emits exactly one "I" sync_action.
export async function enqueueSavesBulk(
  items: BulkEnqueueItem[],
  opts: EnqueueOptions = {},
): Promise<BulkEnqueueResult> {
  const db = await getDb();
  const result: BulkEnqueueResult = { created: 0, existing: 0, failed: 0 };

  // Classify + dedupe within the batch by (source, sourceId).
  interface Candidate {
    url: string;
    source: Source;
    sourceId: string;
    seed?: EnqueueSeed;
  }
  const candidates: Candidate[] = [];
  const seenKeys = new Set<string>();
  for (const item of items) {
    const url = normalizeUrl(item.url);
    const { source } = classifyUrlToSource(url);
    if (!source) {
      result.failed += 1;
      continue;
    }
    const sourceId = sourceIdFromUrl(source, url);
    if (!sourceId) {
      result.failed += 1;
      continue;
    }
    const key = `${source}\u0000${sourceId}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    candidates.push({ url, source, sourceId, seed: item.seed });
  }
  if (candidates.length === 0) return result;

  // Find which already exist (one query per source group).
  const bySource = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const list = bySource.get(c.source) ?? [];
    list.push(c);
    bySource.set(c.source, list);
  }
  const existingKeys = new Set<string>();
  for (const [source, group] of bySource) {
    const ids = group.map((c) => c.sourceId);
    for (const idChunk of chunk(ids, 400)) {
      const rows = db
        .select({ sourceId: saves.sourceId })
        .from(saves)
        .where(
          and(
            eq(saves.source, source as Candidate["source"]),
            inArray(saves.sourceId, idChunk),
          ),
        )
        .all();
      for (const r of rows) existingKeys.add(`${source}\u0000${r.sourceId}`);
    }
  }

  // Existing → per-item path (reseed / enrich). New → batched insert.
  const fresh: Candidate[] = [];
  const existing: Candidate[] = [];
  for (const c of candidates) {
    if (existingKeys.has(`${c.source}\u0000${c.sourceId}`)) existing.push(c);
    else fresh.push(c);
  }

  for (const c of existing) {
    try {
      await enqueueSaveByUrl(c.url, {
        trigger: opts.trigger,
        ...(c.seed ? { seed: c.seed } : {}),
      });
      result.existing += 1;
    } catch (err) {
      result.failed += 1;
      log.warn("[pond pipeline:enqueue] bulk existing item failed", c.url, err);
    }
  }

  if (fresh.length === 0) {
    if (result.existing > 0) kickReconciler();
    return result;
  }

  // Build a bundle per save (row + tasks + action) and commit in bounded chunks,
  // yielding between them: better-sqlite3 is synchronous on the main thread, so
  // one giant transaction would freeze the UI for seconds on a 50k first sync.
  const now = new Date();
  const actorOf = (): "user" | "system" =>
    opts.trigger?.startsWith("user:") ? "user" : "system";
  interface Bundle {
    save: NewSave;
    tasks: NewTask[];
    action: NewSyncAction;
  }
  const bundles: Bundle[] = fresh.map((c) => {
    const id = ulid();
    const save: NewSave = {
      id,
      source: c.source,
      sourceId: c.sourceId,
      url: c.url,
      status: "ingesting",
      ingestStartedAt: now,
      tags: [],
      files: [],
      coverIndex: 0,
      savedAt: now,
      createdAt: now,
      ...(c.seed ? seedToInsertColumns(c.seed) : {}),
    };
    const taskRows: NewTask[] = planOps(c.source).map((op) => ({
      id: ulid(),
      saveId: id,
      op,
      status: "pending",
      attempts: 0,
      maxAttempts: maxAttemptsFor(op),
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    }));
    const action: NewSyncAction = {
      modelName: "save",
      modelId: id,
      action: "I",
      data: save as unknown,
      actor: actorOf(),
      actorReason: opts.trigger ?? "pipeline:enqueue:bulk",
      batchId: ulid(),
    };
    return { save, tasks: taskRows, action };
  });

  const insertedActions: SyncAction[] = [];
  for (const group of chunk(bundles, BULK_INSERT_CHUNK)) {
    const groupActions = db.transaction((tx) => {
      tx.insert(saves)
        .values(group.map((b) => b.save))
        .run();
      tx.insert(tasks)
        .values(group.flatMap((b) => b.tasks))
        .run();
      return tx
        .insert(syncActions)
        .values(group.map((b) => b.action))
        .returning()
        .all();
    });
    insertedActions.push(...groupActions);
    // Yield so the UI thread can paint / handle IPC between commits.
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  result.created = fresh.length;
  for (const action of insertedActions) broadcastSyncAction(action);
  kickReconciler();
  log.info("[pond pipeline:enqueue] bulk enqueue", {
    created: result.created,
    existing: result.existing,
    failed: result.failed,
    trigger: opts.trigger,
  });
  return result;
}

// Stay one below the pool's twitter cap (3) so an interactive sync can still
// lease a window while a backfill is running.
const SCREENSHOT_BACKFILL_CONCURRENCY = 2;

// Consecutive auth-wall misses that trip the early abort (stale session).
const SCREENSHOT_AUTH_WALL_ABORT = 6;

export interface BackfillStatusUpdate {
  state: "idle" | "running" | "done" | "error";
  attempted: number;
  captured: number;
  total: number;
  message?: string;
  lastError?: string | null;
}

type BackfillListener = (update: BackfillStatusUpdate) => void;
const backfillListeners = new Set<BackfillListener>();
let backfillStatus: BackfillStatusUpdate = {
  state: "idle",
  attempted: 0,
  captured: 0,
  total: 0,
};
let backfillCancelRequested = false;

export function subscribeToBackfillStatus(cb: BackfillListener): () => void {
  backfillListeners.add(cb);
  return () => {
    backfillListeners.delete(cb);
  };
}

export function getBackfillStatus(): BackfillStatusUpdate {
  return backfillStatus;
}

export function isBackfillRunning(): boolean {
  return backfillStatus.state === "running";
}

function emitBackfill(patch: Partial<BackfillStatusUpdate>): void {
  backfillStatus = { ...backfillStatus, ...patch };
  for (const cb of backfillListeners) {
    try {
      cb(backfillStatus);
    } catch (err) {
      log.warn("[pond pipeline:capture-tweet] backfill listener threw", err);
    }
  }
}

export function cancelTweetScreenshotBackfill(): void {
  if (backfillStatus.state !== "running") return;
  backfillCancelRequested = true;
  emitBackfill({ message: "Stopping…" });
}

// User-initiated recapture for twitter saves missing a screenshot variant; never re-ingests.
export async function startTweetScreenshotBackfill(): Promise<void> {
  if (backfillStatus.state === "running") {
    log.info(
      "[pond pipeline:capture-tweet] backfill already running, ignoring",
    );
    return;
  }
  backfillCancelRequested = false;
  emitBackfill({
    state: "running",
    attempted: 0,
    captured: 0,
    total: 0,
    message: "Looking for screenshots to recapture…",
    lastError: null,
  });

  const connected = await isSourceConnected("twitter").catch(() => false);
  if (!connected) {
    log.info("[pond pipeline:capture-tweet] backfill skipped, X not connected");
    emitBackfill({
      state: "error",
      message: "Connect X to backfill screenshots.",
      lastError: "not_connected",
    });
    return;
  }

  const db = await getDb();
  const rows = db
    .select()
    .from(saves)
    .where(and(eq(saves.source, "twitter"), isNull(saves.deletedAt)))
    .all();

  const needCapture: string[] = [];
  for (const row of rows) {
    // Mid-ingest saves are owned by the reconciler; skip to avoid double-leasing.
    if (row.status === "ingesting") continue;
    // Recapture out-of-date saves even if both variants exist (version bump).
    if (readCaptureTweetVersion(row.rawJson) < CAPTURE_TWEET_VERSION) {
      needCapture.push(row.id);
      continue;
    }
    const files = (row.files ?? []) as SaveFile[];
    const hasLight = files.some((f) => f.kind === TWEET_SCREENSHOT_LIGHT_KIND);
    const hasDark = files.some((f) => f.kind === TWEET_SCREENSHOT_DARK_KIND);
    if (hasLight && hasDark) continue;
    needCapture.push(row.id);
  }
  if (needCapture.length === 0) {
    emitBackfill({
      state: "done",
      total: 0,
      message: "All screenshots are up to date.",
    });
    return;
  }

  log.info(
    "[pond pipeline:capture-tweet] backfill starting",
    needCapture.length,
    "saves",
  );

  const total = needCapture.length;
  let cursor = 0;
  let attempted = 0;
  let captured = 0;
  let authWallStreak = 0;
  let authWallAborted = false;
  emitBackfill({
    total,
    message: `Recapturing 0 of ${total}…`,
  });

  const worker = async (): Promise<void> => {
    while (!backfillCancelRequested && !authWallAborted) {
      const saveId = needCapture[cursor];
      if (saveId === undefined) break;
      cursor += 1;
      try {
        const result = await runCaptureTweet(saveId);
        captured += result.captured;
        // Out-of-band, so kick fetch_blobs ourselves for any merged quoted media.
        if (result.mediaAdded) {
          await runFetchBlobs(saveId).catch((err) =>
            log.warn(
              "[pond pipeline:capture-tweet] backfill fetch-blobs failed",
              saveId,
              err,
            ),
          );
        }
        if (result.captured === 0 && result.authWall) {
          authWallStreak += 1;
          if (authWallStreak >= SCREENSHOT_AUTH_WALL_ABORT) {
            authWallAborted = true;
            log.warn(
              "[pond pipeline:capture-tweet] backfill aborted, repeated auth walls",
            );
          }
        } else if (result.captured > 0) {
          authWallStreak = 0;
        }
      } catch (err) {
        log.warn(
          "[pond pipeline:capture-tweet] backfill capture failed",
          saveId,
          err,
        );
      }
      attempted += 1;
      emitBackfill({
        attempted,
        captured,
        message: `Recapturing ${attempted} of ${total}…`,
      });
    }
  };

  const lanes = Math.min(SCREENSHOT_BACKFILL_CONCURRENCY, needCapture.length);
  await Promise.all(Array.from({ length: lanes }, () => worker()));

  log.info("[pond pipeline:capture-tweet] backfill done", {
    attempted,
    captured,
    cancelled: backfillCancelRequested,
    authWallAborted,
  });

  if (authWallAborted) {
    emitBackfill({
      state: "error",
      message: "Sign in to X to recapture screenshots.",
      lastError: "auth_required",
    });
  } else if (backfillCancelRequested) {
    emitBackfill({
      state: "idle",
      message: `Stopped after ${captured} recaptured.`,
    });
  } else {
    emitBackfill({
      state: "done",
      message: `Recaptured ${captured} screenshot${captured === 1 ? "" : "s"}.`,
    });
  }
}

export async function resetTasksForSave(
  saveId: string,
  reason: string,
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  db.update(tasks)
    .set({
      status: "pending",
      attempts: 0,
      lastError: null,
      nextRunAt: now,
      updatedAt: now,
    })
    .where(eq(tasks.saveId, saveId))
    .run();
  db.update(saves)
    .set({ status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null })
    .where(eq(saves.id, saveId))
    .run();
  log.info("[pond pipeline:enqueue] reset tasks", { saveId, reason });
}

// Re-run failed saves: reset only each save's `failed` tasks back to pending
// (done steps stay done) and flip the save to `ingesting` via persistSave so the
// reconciler picks it up and the change broadcasts to the renderer. `ids` scopes
// the retry; omit it to retry every failed save. Returns the count requeued.
export async function retryFailedSaves(
  ids?: readonly string[],
): Promise<number> {
  const db = await getDb();
  const scoped = ids != null && ids.length > 0;
  const rows = scoped
    ? db
        .select({ id: saves.id })
        .from(saves)
        .where(and(eq(saves.status, "failed"), inArray(saves.id, [...ids])))
        .all()
    : db
        .select({ id: saves.id })
        .from(saves)
        .where(and(eq(saves.status, "failed"), isNull(saves.deletedAt)))
        .all();
  if (rows.length === 0) return 0;

  const now = new Date();
  for (const { id } of rows) {
    db.update(tasks)
      .set({
        status: "pending",
        attempts: 0,
        lastError: null,
        nextRunAt: now,
        updatedAt: now,
      })
      .where(and(eq(tasks.saveId, id), eq(tasks.status, "failed")))
      .run();
    await persistSave(
      id,
      { status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null },
      { actorReason: "pipeline:retry-failed" },
    );
  }

  log.info("[pond pipeline:enqueue] retry failed saves", {
    requeued: rows.length,
    scoped,
  });
  kickReconciler();
  return rows.length;
}

function seedToInsertColumns(seed: EnqueueSeed): Partial<NewSave> {
  const out: Partial<NewSave> = { rawJson: seed.rawJson };
  if (seed.title !== undefined) out.title = seed.title;
  if (seed.description !== undefined) out.description = seed.description;
  if (seed.author !== undefined) out.author = seed.author;
  if (seed.mediaUrl !== undefined) out.mediaUrl = seed.mediaUrl;
  if (seed.mediaType !== undefined) out.mediaType = seed.mediaType;
  if (seed.publishedAt !== undefined) out.publishedAt = seed.publishedAt;
  if (seed.lang !== undefined) out.lang = seed.lang;
  return out;
}

async function applySeedToExistingSave(
  saveId: string,
  seed: EnqueueSeed,
): Promise<void> {
  const db = await getDb();
  const patch = seedToInsertColumns(seed);
  db.update(saves).set(patch).where(eq(saves.id, saveId)).run();
  const inserted = db
    .insert(syncActions)
    .values({
      modelName: "save",
      modelId: saveId,
      action: "U",
      data: patch as unknown,
      actor: "system",
      actorReason: "pipeline:enqueue:reseed",
      batchId: ulid(),
    })
    .returning()
    .all()[0];
  if (inserted) broadcastSyncAction(inserted);
}

interface SeedMerge {
  changed: boolean;
  filled: string[];
  didFillAvatarUrl: boolean;
  rawJson: RawJson | null;
}

// Additive merge, scoped to `capture.author.*`: fills missing fields, never overwrites.
function mergeSeedIntoExistingSave(
  current: Save,
  seed: EnqueueSeed,
): SeedMerge {
  const existingRaw =
    current.rawJson && typeof current.rawJson === "object"
      ? (current.rawJson as RawJson)
      : null;
  const seedRaw = seed.rawJson;

  const existingAuthor: CaptureAuthor = existingRaw?.capture?.author ?? {};
  const seedAuthor: CaptureAuthor = seedRaw.capture?.author ?? {};
  const nextAuthor: CaptureAuthor = { ...existingAuthor };
  const filled: string[] = [];
  let didFillAvatarUrl = false;
  for (const key of [
    "name",
    "handle",
    "avatarUrl",
    "profileUrl",
    "verified",
  ] as const) {
    const have = nextAuthor[key];
    const fresh = seedAuthor[key];
    if ((have === undefined || have === null || have === "") && fresh != null) {
      (nextAuthor[key] as unknown) = fresh;
      filled.push(`capture.author.${key}`);
      if (key === "avatarUrl") didFillAvatarUrl = true;
    }
  }

  if (filled.length === 0) {
    return { changed: false, filled, didFillAvatarUrl, rawJson: existingRaw };
  }

  const baseRaw = existingRaw ?? seedRaw;
  const nextRaw: RawJson = {
    ...baseRaw,
    capture: {
      ...(existingRaw?.capture ?? seedRaw.capture),
      author: nextAuthor,
    },
  };

  return { changed: true, filled, didFillAvatarUrl, rawJson: nextRaw };
}

async function persistEnrichment(
  saveId: string,
  merge: SeedMerge,
): Promise<void> {
  if (!merge.changed || !merge.rawJson) return;
  const db = await getDb();
  const patch: Partial<NewSave> = { rawJson: merge.rawJson };
  db.update(saves).set(patch).where(eq(saves.id, saveId)).run();
  const inserted = db
    .insert(syncActions)
    .values({
      modelName: "save",
      modelId: saveId,
      action: "U",
      data: { filled: merge.filled } as unknown,
      actor: "system",
      actorReason: "pipeline:enqueue:enrich",
      batchId: ulid(),
    })
    .returning()
    .all()[0];
  if (inserted) broadcastSyncAction(inserted);
}

// Re-pend only `done` fetch_avatar rows so the newly-filled URL lands on disk.
async function rependFetchAvatar(saveId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  db.update(tasks)
    .set({ status: "pending", nextRunAt: now, lastError: null, updatedAt: now })
    .where(
      and(
        eq(tasks.saveId, saveId),
        eq(tasks.op, "fetch_avatar"),
        eq(tasks.status, "done"),
      ),
    )
    .run();
}

function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = "";
    // Strip common tracking parameters; harmless for canonical equality.
    for (const key of Array.from(u.searchParams.keys())) {
      if (
        key.startsWith("utm_") ||
        key === "fbclid" ||
        key === "igshid" ||
        key === "si"
      ) {
        u.searchParams.delete(key);
      }
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}
