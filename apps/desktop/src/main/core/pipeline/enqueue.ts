import {
  type ListKind,
  type NewSave,
  type NewSyncAction,
  type NewTask,
  type Source,
  type SyncAction,
  saves,
  syncActions,
  tasks,
} from "@pond/schema/db";
import { domainFromUrl } from "@pond/schema/domain";
import { listKindsEqual, mergeListKinds } from "@pond/schema/list-kinds";
import type { Capture } from "@pond/schema/raw";
import { and, eq, inArray, isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { broadcastSyncAction } from "../executor";
import { persistSave } from "../persist-save";
import type { ImportableCookie } from "../refresh/scrape-window/session";
import { classifyUrlToSource } from "./extractors";
import { UnsupportedError } from "./extractors/errors";
import { listKindsFromTrigger } from "./list-kinds";
import { stashPageCookies } from "./page-cookies";
import { kickReconciler } from "./reconciler";
import {
  applySeedToExistingSave,
  type EnqueueSeed,
  mergeSeedIntoExistingSave,
  persistEnrichment,
  rependFetchAvatar,
  seedToInsertColumns,
} from "./seed";
import { maxAttemptsFor, planOps } from "./specs";
import { sourceIdFromUrl } from "./url";

function stashWebCookiesThenKick(
  saveId: string,
  source: Source,
  cookies: ImportableCookie[] | undefined,
): void {
  if (source === "web" && cookies && cookies.length > 0) {
    stashPageCookies(saveId, cookies);
  }
  kickReconciler();
}

async function rependArchiveForCookies(saveId: string): Promise<void> {
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
    .where(
      and(
        eq(tasks.saveId, saveId),
        inArray(tasks.op, ["archive_page", "finalize"]),
      ),
    )
    .run();
  await persistSave(
    saveId,
    { status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null },
    { actorReason: "pipeline:enqueue:page-cookies" },
  );
}

export interface EnqueueItem {
  url: string;
  seed?: EnqueueSeed;
  listKinds?: ListKind[];
}

export interface EnqueueOneResult {
  id: string;
  created: boolean;
  reseeded?: boolean;
}

export interface EnqueueManyResult {
  created: number;
  existing: number;
  failed: number;
}

export interface EnqueueOptions {
  trigger?: string;
  force?: boolean;
  seed?: EnqueueSeed;
  accountId?: string | null;
  cookies?: ImportableCookie[];
  listKinds?: ListKind[];
}

const HARVEST_FRESH_MS = 24 * 60 * 60 * 1000;

/** yt-dlp rows carry no capture and pre-harvest rows no `extractedAt`, so both are optional at rest. */
interface HarvestedRawJson {
  capture?: Partial<Capture>;
  extractedAt?: string;
}

export function isFreshHarvest(
  rawJson: HarvestedRawJson | null,
  now = Date.now(),
): boolean {
  if (!rawJson?.extractedAt || !rawJson.capture) return false;
  const ms = Date.parse(rawJson.extractedAt);
  if (!Number.isFinite(ms)) return false;
  return now - ms < HARVEST_FRESH_MS;
}

function isItemList(
  input: string | readonly EnqueueItem[],
): input is readonly EnqueueItem[] {
  return Array.isArray(input);
}

export function enqueue(
  url: string,
  opts?: EnqueueOptions,
): Promise<EnqueueOneResult>;
export function enqueue(
  items: readonly EnqueueItem[],
  opts?: EnqueueOptions,
): Promise<EnqueueManyResult>;
export async function enqueue(
  input: string | readonly EnqueueItem[],
  opts: EnqueueOptions = {},
): Promise<EnqueueOneResult | EnqueueManyResult> {
  if (isItemList(input)) return enqueueMany(input, opts);
  return enqueueOne(input, opts);
}

async function enqueueOne(
  rawUrl: string,
  opts: EnqueueOptions = {},
): Promise<EnqueueOneResult> {
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
  const incomingKinds = mergeListKinds(
    opts.listKinds,
    listKindsFromTrigger(opts.trigger),
  );

  if (current) {
    await persistMergedListKinds(
      current.id,
      current.listKinds,
      incomingKinds,
      opts.trigger ?? "pipeline:enqueue",
    );
    if (opts.seed && current.status === "failed") {
      await resetTasksForSave(
        current.id,
        opts.trigger ?? "enqueue:reseed-failed",
      );
      await applySeedToExistingSave(current.id, opts.seed);
      stashWebCookiesThenKick(current.id, source, opts.cookies);
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
    } else if (
      source === "web" &&
      (opts.cookies?.length ?? 0) > 0 &&
      (current.status === "complete" || current.status === "failed")
    ) {
      await rependArchiveForCookies(current.id);
    }
    stashWebCookiesThenKick(current.id, source, opts.cookies);
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
    accountId: opts.accountId ?? null,
    url: normalizedUrl,
    siteName: domainFromUrl(normalizedUrl),
    status: "ingesting",
    ingestStartedAt: now,
    tags: [],
    listKinds: incomingKinds,
    files: [],
    coverIndex: 0,
    savedAt: now,
    createdAt: now,
  };
  if (opts.seed) Object.assign(insertValues, seedToInsertColumns(opts.seed));

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

  /** One transaction so a crash cannot leave a half-ingested save, and one fsync instead of three. */
  const insertedAction = db.transaction((tx) => {
    tx.insert(saves).values(insertValues).run();
    tx.insert(tasks).values(taskRows).run();
    return tx
      .insert(syncActions)
      .values({
        modelName: "save",
        modelId: id,
        action: "I",
        data: insertValues,
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
  stashWebCookiesThenKick(id, source, opts.cookies);
  return { id, created: true };
}

async function persistMergedListKinds(
  saveId: string,
  current: ListKind[] | null | undefined,
  incoming: ListKind[],
  reason: string,
): Promise<void> {
  if (incoming.length === 0) return;
  const merged = mergeListKinds(current, incoming);
  if (listKindsEqual(current, merged)) return;
  await persistSave(saveId, { listKinds: merged }, { actorReason: reason });
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

export function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = "";
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

const BULK_INSERT_CHUNK = 100;

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

async function enqueueMany(
  items: readonly EnqueueItem[],
  opts: EnqueueOptions = {},
): Promise<EnqueueManyResult> {
  const db = await getDb();
  const result: EnqueueManyResult = { created: 0, existing: 0, failed: 0 };

  interface Candidate {
    url: string;
    source: Source;
    sourceId: string;
    seed?: EnqueueSeed;
    listKinds: ListKind[];
  }
  const candidates: Candidate[] = [];
  const byKey = new Map<string, Candidate>();
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
    const kinds = mergeListKinds(
      item.listKinds,
      listKindsFromTrigger(opts.trigger),
    );
    const key = `${source}\u0000${sourceId}`;
    const prev = byKey.get(key);
    if (prev) {
      prev.listKinds = mergeListKinds(prev.listKinds, kinds);
      continue;
    }
    const candidate: Candidate = { url, source, sourceId, listKinds: kinds };
    if (item.seed) candidate.seed = item.seed;
    byKey.set(key, candidate);
    candidates.push(candidate);
  }
  if (candidates.length === 0) return result;

  const bySource = new Map<Source, Candidate[]>();
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
        .where(and(eq(saves.source, source), inArray(saves.sourceId, idChunk)))
        .all();
      for (const r of rows) existingKeys.add(`${source}\u0000${r.sourceId}`);
    }
  }

  const fresh: Candidate[] = [];
  const existing: Candidate[] = [];
  for (const c of candidates) {
    if (existingKeys.has(`${c.source}\u0000${c.sourceId}`)) existing.push(c);
    else fresh.push(c);
  }

  for (const c of existing) {
    try {
      const one: EnqueueOptions = {
        trigger: opts.trigger,
        force: opts.force,
        accountId: opts.accountId,
        listKinds: c.listKinds,
      };
      if (c.seed) one.seed = c.seed;
      await enqueueOne(c.url, one);
      result.existing += 1;
    } catch (err) {
      result.failed += 1;
      log.warn("[pond pipeline:enqueue] many existing item failed", c.url, err);
    }
  }

  if (fresh.length === 0) {
    if (result.existing > 0) kickReconciler();
    return result;
  }

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
      accountId: opts.accountId ?? null,
      url: c.url,
      siteName: domainFromUrl(c.url),
      status: "ingesting",
      ingestStartedAt: now,
      tags: [],
      listKinds: c.listKinds,
      files: [],
      coverIndex: 0,
      savedAt: now,
      createdAt: now,
    };
    if (c.seed) Object.assign(save, seedToInsertColumns(c.seed));
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
      data: save,
      actor: actorOf(),
      actorReason: opts.trigger ?? "pipeline:enqueue:many",
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
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  result.created = fresh.length;
  for (const action of insertedActions) broadcastSyncAction(action);
  kickReconciler();
  log.info("[pond pipeline:enqueue] many", {
    created: result.created,
    existing: result.existing,
    failed: result.failed,
    trigger: opts.trigger,
  });
  return result;
}
