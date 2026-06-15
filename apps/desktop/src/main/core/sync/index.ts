import {
  DEFAULT_SOURCE_SYNC_PREFS,
  type Source,
  type SourceSyncPrefs,
  saves,
} from "@pond/schema/db";
import type { SyncRunEvent } from "@pond/schema/events";
import { eq } from "drizzle-orm";
import log from "electron-log/main.js";
import pLimit from "p-limit";
import { getDb } from "../../db";
import { commitEvent, startSyncEvent, toErrorInfo } from "../../lib/wide-event";
import { enqueueSaveByUrl } from "../pipeline/enqueue";
import { extractorFor } from "../pipeline/extractors";
import { getPrefs, setPrefs } from "../prefs";
import {
  harvestSourceList,
  harvestTwitterBookmarks,
  harvestYoutubeLikedList,
  isSourceConnected,
  probeUserHandle,
  readStoredHandle,
} from "../refresh/scrape-window";
import { isSyncBlockedByStorageGuard } from "../storage-watcher";
import { buildTwitterBookmarkSeed } from "./twitter-seed";

export interface SyncOptions {
  trigger?: "manual" | "cron";
  // Cap on new items enqueued per source; the full list is still walked.
  maxItems?: number;
}

export interface SyncStatusUpdate {
  source: Source;
  state: "idle" | "running" | "done" | "error" | "auth_required";
  message?: string;
  progress?: { current: number; total: number };
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

type StatusListener = (update: SyncStatusUpdate) => void;
const listeners = new Set<StatusListener>();

interface InFlight {
  controller: AbortController;
  startedAt: number;
  watchdog: ReturnType<typeof setTimeout>;
}

const inFlight = new Map<Source, InFlight>();

// Watchdog: abort a stuck sync so the slot clears; Twitter gets the loosest cap.
const SYNC_WATCHDOG_MS: Record<Source, number> = {
  twitter: 30 * 60_000,
  youtube: 20 * 60_000,
  cosmos: 20 * 60_000,
  arena: 20 * 60_000,
  pinterest: 20 * 60_000,
  instagram: 20 * 60_000,
  tiktok: 20 * 60_000,
  reddit: 20 * 60_000,
  // Local never syncs; present only for the record total.
  local: 20 * 60_000,
};

export function subscribeToSyncStatus(cb: StatusListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function emit(update: SyncStatusUpdate): void {
  for (const cb of listeners) {
    try {
      cb(update);
    } catch (err) {
      log.warn("[pond sync] status listener threw", err);
    }
  }
}

export async function getSourceSync(source: Source): Promise<SourceSyncPrefs> {
  const prefs = await getPrefs();
  return { ...DEFAULT_SOURCE_SYNC_PREFS, ...prefs.sync.sources[source] };
}

async function patchSourceSync(
  source: Source,
  patch: Partial<SourceSyncPrefs>,
): Promise<SourceSyncPrefs> {
  const prefs = await getPrefs();
  const next: SourceSyncPrefs = {
    ...DEFAULT_SOURCE_SYNC_PREFS,
    ...prefs.sync.sources[source],
    ...patch,
  };
  await setPrefs({
    sync: { sources: { ...prefs.sync.sources, [source]: next } },
  });
  return next;
}

export async function syncAllSources(opts: SyncOptions = {}): Promise<void> {
  for (const source of SYNCABLE_SOURCES) {
    const connected = await isSourceConnected(source).catch(() => false);
    if (!connected) continue;
    try {
      await syncSource(source, opts);
    } catch (err) {
      log.warn("[pond sync] syncSource threw", source, err);
    }
  }
}

const SYNCABLE_SOURCES: readonly Source[] = [
  "twitter",
  "youtube",
  "cosmos",
  "arena",
  "pinterest",
  "instagram",
  "tiktok",
];

export async function syncSource(
  source: Source,
  opts: SyncOptions = {},
): Promise<void> {
  const existing = inFlight.get(source);
  if (existing) {
    const ageSec = Math.round((Date.now() - existing.startedAt) / 1000);
    log.info(
      `[pond sync] already running (${ageSec}s), ignoring ${source} (${opts.trigger ?? "manual"})`,
    );
    return;
  }
  if (isSyncBlockedByStorageGuard()) {
    log.info(
      "[pond sync] blocked by storage guard, skipping",
      source,
      opts.trigger ?? "manual",
    );
    emit({
      source,
      state: "error",
      message: "Paused. Pond storage cap reached. Free space or raise the cap.",
      lastError: "storage_cap_exceeded",
    });
    return;
  }
  const controller = new AbortController();
  let watchdogTripped = false;
  const watchdog = setTimeout(() => {
    watchdogTripped = true;
    log.warn(
      `[pond sync] watchdog tripped for ${source} after ${Math.round(SYNC_WATCHDOG_MS[source] / 60_000)}m; aborting`,
    );
    controller.abort();
  }, SYNC_WATCHDOG_MS[source]);
  const startedAt = Date.now();
  inFlight.set(source, {
    controller,
    startedAt,
    watchdog,
  });
  // One wide event per sync run, mutated then committed in the finally.
  const ev: SyncRunEvent = startSyncEvent({
    source,
    trigger: opts.trigger ?? "manual",
    outcome: "ok",
  });
  emit({ source, state: "running", message: "Starting…" });
  try {
    if (source === "twitter") {
      await syncTwitter(controller.signal, ev, opts.maxItems);
    } else if (LIST_HARVEST_SOURCES.has(source)) {
      await syncListSource(source, controller.signal, ev, opts.maxItems);
    } else {
      await patchSourceSync(source, { lastError: "unsupported" });
      emit({
        source,
        state: "error",
        message: "This source doesn't support background sync yet.",
        lastError: "unsupported",
      });
      ev.outcome = "error";
      ev.error = { name: "Unsupported", message: "source has no sync runner" };
      return;
    }
    if (controller.signal.aborted) {
      ev.outcome = "aborted";
      // Push an explicit idle so the UI clears its spinner; watchdog reports an error.
      const cfg = await getSourceSync(source);
      emit({
        source,
        state: watchdogTripped ? "error" : "idle",
        message: watchdogTripped ? "Sync timed out." : "Sync stopped.",
        lastSyncedAt: cfg.lastSyncedAt,
        lastError: watchdogTripped ? "watchdog_timeout" : cfg.lastError,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("[pond sync] fatal error", source, err);
    await patchSourceSync(source, { lastError: msg });
    emit({
      source,
      state: "error",
      message: msg,
      lastError: msg,
    });
    ev.outcome = "error";
    ev.error = toErrorInfo(err);
  } finally {
    const entry = inFlight.get(source);
    if (entry) clearTimeout(entry.watchdog);
    inFlight.delete(source);
    ev.durationMs = Date.now() - startedAt;
    ev.lockHeldMs = ev.durationMs;
    ev.watchdogTripped = watchdogTripped;
    if (watchdogTripped) ev.outcome = "aborted";
    void commitEvent(ev);
  }
}

export function cancelSync(source: Source): void {
  const entry = inFlight.get(source);
  if (!entry) return;
  entry.controller.abort();
  // Surface "Stopping…" immediately; the run winds down between steps.
  emit({ source, state: "running", message: "Stopping…" });
}

export function isSyncing(source: Source): boolean {
  return inFlight.has(source);
}

const LIST_HARVEST_SOURCES = new Set<Source>([
  "youtube",
  "cosmos",
  "arena",
  "pinterest",
  "instagram",
  "tiktok",
]);

async function inferAccountKey(source: Source): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ url: saves.url, author: saves.author })
    .from(saves)
    .where(eq(saves.source, source))
    .limit(50);
  // `author` is the saved item's creator, not the account owner. Only trust it
  // for sources without a path-based handle parser (e.g. cosmos); otherwise a
  // favorited block/video would resolve to its creator's name (e.g. arena
  // blocks → "Stephanie Zabala") and poison the user's account key.
  const hasPathParser = Boolean(extractorFor(source)?.handleFromPath);
  let result: string | null = null;
  for (const row of rows) {
    const handle =
      handleFromUrl(source, row.url) ??
      (hasPathParser ? null : (row.author ?? null));
    if (handle) {
      result = handle.replace(/^@/, "");
      break;
    }
  }
  return result;
}

// A cached handle is only trustworthy if it still passes the source's own
// path validator (e.g. arena rejects reserved roots like "block"). Earlier
// buggy runs persisted bad handles; this stops us short-circuiting on them.
function isCachedHandleValid(source: Source, handle: string): boolean {
  const fn = extractorFor(source)?.handleFromPath;
  if (!fn) return true;
  return fn([handle]) != null;
}

// Resolve the user's handle (cosmos/arena/tiktok): cache → DB inference → hidden-window probe.
async function resolveAccountKey(source: Source): Promise<string | null> {
  const cached = await readStoredHandle(source);
  if (cached && isCachedHandleValid(source, cached)) return cached;
  if (cached) {
    log.info(
      `[pond sync:${source}] ignoring invalid cached handle "${cached}"; re-resolving`,
    );
  }

  const inferred = await inferAccountKey(source);
  if (inferred) {
    await persistAccountKey(source, inferred);
    return inferred;
  }

  log.info(`[pond sync:${source}] probing hidden window for handle`);
  const probed = await probeUserHandle(source);
  if (probed) {
    log.info(`[pond sync:${source}] probed handle`, probed);
    await persistAccountKey(source, probed);
    return probed;
  }
  return null;
}

async function persistAccountKey(
  source: Source,
  handle: string,
): Promise<void> {
  try {
    const prefs = await getPrefs();
    const nextHandles = { ...(prefs.sync.handles ?? {}), [source]: handle };
    await setPrefs({ sync: { handles: nextHandles } });
  } catch (err) {
    log.warn(`[pond sync:${source}] failed to cache handle`, err);
  }
}

// Per-source handle parsing lives on each extractor (handleFromPath).
function handleFromUrl(source: Source, url: string): string | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return extractorFor(source)?.handleFromPath?.(segments) ?? null;
  } catch {
    return null;
  }
}

const ENQUEUE_CONCURRENCY = 8;

async function syncListSource(
  source: Source,
  signal: AbortSignal,
  ev: SyncRunEvent,
  maxItems?: number,
): Promise<void> {
  const db = await getDb();
  const knownRows = await db
    .select({ sourceId: saves.sourceId })
    .from(saves)
    .where(eq(saves.source, source));
  const knownIds = new Set<string>(knownRows.map((r) => r.sourceId));
  log.info(
    `[pond sync:${source}] starting; ${knownIds.size} items already in library`,
  );
  emit({
    source,
    state: "running",
    message: `Reading your ${source} list…`,
  });

  let accountKey: string | undefined;
  if (source === "cosmos" || source === "arena" || source === "tiktok") {
    accountKey = (await resolveAccountKey(source)) ?? undefined;
    if (!accountKey) {
      log.info(`[pond sync:${source}] could not resolve account from session`);
      await patchSourceSync(source, { lastError: "auth_required" });
      emit({
        source,
        state: "auth_required",
        message: `Sign in to ${source} to enable background sync.`,
        lastError: "auth_required",
      });
      return;
    }
  } else if (source === "pinterest") {
    accountKey = (await inferAccountKey(source)) || "me";
  }

  const harvest = await harvestSourceList(
    source,
    {
      knownIds: Array.from(knownIds),
      accountKey,
    },
    {
      onProgress: (p) => {
        emit({
          source,
          state: "running",
          message: `Found ${p.collected} saved items${p.fresh > 0 ? ` (${p.fresh} new)` : ""}…`,
        });
      },
    },
  );
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  if (!harvest.ok) {
    if (harvest.reason === "auth_required") {
      await patchSourceSync(source, { lastError: "auth_required" });
      emit({
        source,
        state: "auth_required",
        message: `Sign in to ${source} to enable background sync.`,
        lastError: "auth_required",
      });
      ev.outcome = "auth_required";
      return;
    }
    await patchSourceSync(source, { lastError: harvest.reason });
    emit({
      source,
      state: "error",
      message: `Couldn't read list: ${harvest.reason}.`,
      lastError: harvest.reason,
    });
    ev.outcome = "error";
    ev.error = { name: "HarvestError", message: harvest.reason };
    return;
  }

  const combined = harvest.entries;
  if (source === "youtube") {
    const liked = await harvestYoutubeLikedList({
      knownIds: Array.from(knownIds),
    });
    if (liked.ok) {
      const seen = new Set(combined.map((e) => e.sourceId));
      for (const e of liked.entries) {
        if (!seen.has(e.sourceId)) combined.push(e);
      }
    }
  }

  const allFresh = combined.filter((e) => !knownIds.has(e.sourceId));
  const fresh =
    maxItems && maxItems > 0 ? allFresh.slice(0, maxItems) : allFresh;
  if (maxItems && allFresh.length > fresh.length) {
    log.info(
      `[pond sync:${source}] test cap active. Enqueueing ${fresh.length} of ${allFresh.length} fresh items`,
    );
  }
  ev.harvest = {
    seen: combined.length,
    fresh: fresh.length,
    recovery: 0,
  };
  if (fresh.length === 0) {
    const lastSyncedAt = new Date().toISOString();
    await patchSourceSync(source, { lastSyncedAt, lastError: null });
    emit({
      source,
      state: "done",
      message: "All caught up.",
      lastSyncedAt,
      lastError: null,
    });
    ev.outcome = "noop";
    ev.enqueue = { succeeded: 0, failed: 0 };
    return;
  }

  log.info(
    `[pond sync:${source}] enqueueing ${fresh.length} new URLs into pipeline`,
  );
  emit({
    source,
    state: "running",
    message: `Queueing 0 of ${fresh.length}…`,
    progress: { current: 0, total: fresh.length },
  });

  let processed = 0;
  let enqueueFailed = 0;
  const limit = pLimit(ENQUEUE_CONCURRENCY);
  await Promise.all(
    fresh.map((entry) =>
      limit(async () => {
        if (signal.aborted) return;
        try {
          await enqueueSaveByUrl(entry.url, { trigger: `sync:${source}` });
        } catch (err) {
          log.warn(
            `[pond sync:${source}] enqueue failure`,
            entry.sourceId,
            err,
          );
          enqueueFailed += 1;
        }
        processed += 1;
        emit({
          source,
          state: "running",
          message: `Queueing ${processed} of ${fresh.length}…`,
          progress: { current: processed, total: fresh.length },
        });
      }),
    ),
  );
  ev.enqueue = {
    succeeded: Math.max(0, processed - enqueueFailed),
    failed: enqueueFailed,
  };
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  const lastSyncedAt = new Date().toISOString();
  await patchSourceSync(source, { lastSyncedAt, lastError: null });
  emit({
    source,
    state: "done",
    message: `Queued ${processed} item${processed === 1 ? "" : "s"} for ingest.`,
    progress: { current: processed, total: fresh.length },
    lastSyncedAt,
    lastError: null,
  });
}

async function syncTwitter(
  signal: AbortSignal,
  ev: SyncRunEvent,
  maxItems?: number,
): Promise<void> {
  const source: Source = "twitter";
  const db = await getDb();
  const knownRows = await db
    .select({ sourceId: saves.sourceId, status: saves.status })
    .from(saves)
    .where(eq(saves.source, source));
  const knownIds = new Set<string>(knownRows.map((r) => r.sourceId));
  // Previously-failed tweets we can reseed from GraphQL data when they reappear.
  const failedSourceIds = new Set<string>(
    knownRows.filter((r) => r.status === "failed").map((r) => r.sourceId),
  );
  log.info(
    `[pond sync:twitter] starting; ${knownIds.size} tweets already in library (${failedSourceIds.size} failed)`,
  );
  emit({
    source,
    state: "running",
    message: `Looking at your Twitter bookmarks…`,
  });

  const harvest = await harvestTwitterBookmarks(
    {
      knownIds: Array.from(knownIds),
    },
    {
      onProgress: (p) => {
        if (signal.aborted) return;
        const message =
          p.phase === "hydrate"
            ? "Loading your Twitter bookmarks…"
            : p.fresh > 0
              ? `Found ${p.fresh} new bookmark${p.fresh === 1 ? "" : "s"}…`
              : `Scanned ${p.seen} bookmark${p.seen === 1 ? "" : "s"}…`;
        emit({ source, state: "running", message });
      },
    },
  );
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  if (!harvest.ok) {
    if (harvest.reason === "auth_required") {
      await patchSourceSync(source, { lastError: "auth_required" });
      emit({
        source,
        state: "auth_required",
        message: "Sign in to Twitter to enable background sync.",
        lastError: "auth_required",
      });
      ev.outcome = "auth_required";
      return;
    }
    await patchSourceSync(source, { lastError: harvest.reason });
    emit({
      source,
      state: "error",
      message: `Couldn't read bookmarks: ${harvest.reason}.`,
      lastError: harvest.reason,
    });
    ev.outcome = "error";
    ev.error = { name: "HarvestError", message: harvest.reason };
    return;
  }

  // fresh: unseen tweets (new saves). recovery: failed tweets reseeded with metadata.
  const allFresh = harvest.entries.filter((e) => !knownIds.has(e.tweetId));
  const recovery = harvest.entries.filter((e) =>
    failedSourceIds.has(e.tweetId),
  );
  const fresh =
    maxItems && maxItems > 0 ? allFresh.slice(0, maxItems) : allFresh;
  if (maxItems && allFresh.length > fresh.length) {
    log.info(
      `[pond sync:twitter] test cap active. Enqueueing ${fresh.length} of ${allFresh.length} fresh bookmarks`,
    );
  }
  const total = fresh.length + recovery.length;
  ev.harvest = {
    seen: harvest.entries.length,
    fresh: fresh.length,
    recovery: recovery.length,
  };
  if (total === 0) {
    const lastSyncedAt = new Date().toISOString();
    await patchSourceSync(source, { lastSyncedAt, lastError: null });
    emit({
      source,
      state: "done",
      message: "All caught up.",
      lastSyncedAt,
      lastError: null,
    });
    ev.outcome = "noop";
    ev.enqueue = { succeeded: 0, failed: 0 };
    return;
  }

  log.info(
    `[pond sync:twitter] enqueueing ${fresh.length} new + ${recovery.length} recover`,
  );
  emit({
    source,
    state: "running",
    message:
      recovery.length > 0
        ? `Queueing 0 of ${total} (${recovery.length} recovering)…`
        : `Queueing 0 of ${total} bookmarks…`,
    progress: { current: 0, total },
  });

  let processed = 0;
  let enqueueFailed = 0;
  const limit = pLimit(ENQUEUE_CONCURRENCY);
  const queue = [...fresh, ...recovery];
  await Promise.all(
    queue.map((entry) =>
      limit(async () => {
        if (signal.aborted) return;
        try {
          const seed = buildTwitterBookmarkSeed(entry) ?? undefined;
          await enqueueSaveByUrl(entry.url, {
            trigger: "sync:twitter",
            seed,
          });
        } catch (err) {
          log.warn("[pond sync:twitter] enqueue failure", entry.tweetId, err);
          enqueueFailed += 1;
        }
        processed += 1;
        emit({
          source,
          state: "running",
          message: `Queueing ${processed} of ${total} bookmarks…`,
          progress: { current: processed, total },
        });
      }),
    ),
  );
  ev.enqueue = {
    succeeded: Math.max(0, processed - enqueueFailed),
    failed: enqueueFailed,
  };
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  const lastSyncedAt = new Date().toISOString();
  await patchSourceSync(source, { lastSyncedAt, lastError: null });
  emit({
    source,
    state: "done",
    message:
      recovery.length > 0
        ? `Queued ${fresh.length} new + recovered ${recovery.length} failed.`
        : `Queued ${processed} bookmark${processed === 1 ? "" : "s"} for ingest.`,
    progress: { current: processed, total },
    lastSyncedAt,
    lastError: null,
  });
}
