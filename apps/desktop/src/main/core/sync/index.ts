import {
  DEFAULT_SOURCE_SYNC_PREFS,
  type Source,
  type SourceSyncPrefs,
  saves,
} from "@pond/schema/db";
import type { SyncRunEvent } from "@pond/schema/events";
import { sourceLabel } from "@pond/schema/sources";
import { and, count, desc, eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { commitEvent, startSyncEvent, toErrorInfo } from "../../lib/wide-event";
import { enqueueSavesBulk } from "../pipeline/enqueue";
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
  // Ignore the incremental watermark and walk the whole remote list (loads the
  // full known-id set, disables early-stop). For drift recovery.
  forceFull?: boolean;
}

export interface SyncStatusUpdate {
  source: Source;
  state:
    | "idle"
    | "running"
    | "done"
    | "error"
    | "auth_required"
    // Backed off to protect the account (rate limited / governor cooldown).
    | "paused";
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
  threads: 20 * 60_000,
  // Web links are saved individually, never list-synced; present for the record total.
  web: 20 * 60_000,
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

// Most-recent known ids loaded for an incremental run. Lists are newest-first,
// so this window is enough to detect the already-synced backlog and early-stop.
const RECENT_KNOWN_WINDOW = 1500;

interface SyncBaseline {
  // Known source ids for dedup + harvester early-stop. Full set on a full sync,
  // a bounded recent window on an incremental sync.
  knownIds: Set<string>;
  // True library size for this source (UI + watermark).
  total: number;
  // Whether this run is a full walk (first sync or forced).
  full: boolean;
}

// Decide full vs incremental and load the right baseline. A full walk happens on
// the very first sync (no prior full sync recorded) or when explicitly forced.
async function loadSyncBaseline(
  source: Source,
  forceFull: boolean,
): Promise<SyncBaseline> {
  const db = await getDb();
  const cfg = await getSourceSync(source);
  const full = forceFull || cfg.lastFullSyncAt === null;
  if (full) {
    const rows = await db
      .select({ sourceId: saves.sourceId })
      .from(saves)
      .where(eq(saves.source, source));
    const knownIds = new Set<string>(rows.map((r) => r.sourceId));
    return { knownIds, total: knownIds.size, full: true };
  }
  const rows = await db
    .select({ sourceId: saves.sourceId })
    .from(saves)
    .where(eq(saves.source, source))
    .orderBy(desc(saves.savedAt))
    .limit(RECENT_KNOWN_WINDOW);
  const knownIds = new Set<string>(rows.map((r) => r.sourceId));
  const totalRow = await db
    .select({ c: count() })
    .from(saves)
    .where(eq(saves.source, source))
    .get();
  return { knownIds, total: totalRow?.c ?? knownIds.size, full: false };
}

// Persist the incremental cursor after a successful run. Only advance
// `lastFullSyncAt` on a full walk so the next run can go incremental.
async function persistWatermark(
  source: Source,
  opts: { full: boolean; newestId: string | null; total: number },
): Promise<string> {
  const lastSyncedAt = new Date().toISOString();
  const patch: Partial<SourceSyncPrefs> = {
    lastSyncedAt,
    lastError: null,
    knownCount: opts.total,
  };
  if (opts.newestId) patch.highWaterMark = opts.newestId;
  if (opts.full) patch.lastFullSyncAt = lastSyncedAt;
  await patchSourceSync(source, patch);
  return lastSyncedAt;
}

export async function syncAllSources(opts: SyncOptions = {}): Promise<void> {
  const connected = await Promise.all(
    SYNCABLE_SOURCES.map(async (source) =>
      (await isSourceConnected(source).catch(() => false)) ? source : null,
    ),
  );
  const sources = connected.filter((s): s is Source => s !== null);
  if (sources.length === 0) return;
  // Run sources concurrently; real concurrency is bounded by the shared window
  // pool and the governor. Different sources hit different domains, so cross-
  // source parallelism doesn't raise per-account risk.
  await Promise.all(
    sources.map((source) =>
      syncSource(source, opts).catch((err) =>
        log.warn("[pond sync] syncSource threw", source, err),
      ),
    ),
  );
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
  // Persist an in-flight marker so a crash/force-quit mid-run is recoverable on
  // next launch (see recoverInterruptedSyncs). Best-effort; never block the run.
  void patchSourceSync(source, {
    runningSince: new Date(startedAt).toISOString(),
  }).catch(() => {});
  // One wide event per sync run, mutated then committed in the finally.
  const ev: SyncRunEvent = startSyncEvent({
    source,
    trigger: opts.trigger ?? "manual",
    outcome: "ok",
  });
  emit({ source, state: "running", message: "Starting…" });
  try {
    if (source === "twitter") {
      await syncTwitter(controller.signal, ev, opts.maxItems, opts.forceFull);
    } else if (LIST_HARVEST_SOURCES.has(source)) {
      await syncListSource(
        source,
        controller.signal,
        ev,
        opts.maxItems,
        opts.forceFull,
      );
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
    // Clear the persisted in-flight marker; the run reached a terminal state.
    void patchSourceSync(source, { runningSince: null }).catch(() => {});
    ev.durationMs = Date.now() - startedAt;
    ev.lockHeldMs = ev.durationMs;
    ev.watchdogTripped = watchdogTripped;
    if (watchdogTripped) ev.outcome = "aborted";
    void commitEvent(ev);
  }
}

// On startup, a source still flagged `runningSince` was interrupted by a crash
// (a clean finish clears it). Clear the stale marker and record a lastError so
// the UI doesn't show a stuck spinner; re-running is safe (idempotent watermarks).
export async function recoverInterruptedSyncs(): Promise<Source[]> {
  const recovered: Source[] = [];
  for (const source of SYNCABLE_SOURCES) {
    const cfg = await getSourceSync(source);
    if (!cfg.runningSince) continue;
    recovered.push(source);
    await patchSourceSync(source, {
      runningSince: null,
      lastError: "interrupted",
    }).catch(() => {});
    emit({
      source,
      state: "idle",
      message: "Previous sync was interrupted.",
      lastSyncedAt: cfg.lastSyncedAt,
      lastError: "interrupted",
    });
  }
  if (recovered.length > 0) {
    log.info("[pond sync] recovered interrupted runs", recovered);
  }
  return recovered;
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

async function syncListSource(
  source: Source,
  signal: AbortSignal,
  ev: SyncRunEvent,
  maxItems?: number,
  forceFull = false,
): Promise<void> {
  const baseline = await loadSyncBaseline(source, forceFull);
  const knownIds = baseline.knownIds;
  log.info(
    `[pond sync:${source}] starting; ${baseline.total} items already in library (${baseline.full ? "full" : `incremental, ${knownIds.size}-id window`})`,
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
    if (harvest.reason === "rate_limited") {
      const waitMin = harvest.retryAfterSec
        ? Math.max(1, Math.round(harvest.retryAfterSec / 60))
        : null;
      await patchSourceSync(source, { lastError: "rate_limited" });
      emit({
        source,
        state: "paused",
        message: waitMin
          ? `${sourceLabel(source)} asked us to slow down — paused ~${waitMin} min to protect your account.`
          : `${sourceLabel(source)} asked us to slow down — paused to protect your account.`,
        lastError: "rate_limited",
      });
      ev.outcome = "rate_limited";
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
  // Honest seen: the harvester's scanned total (often more than the fresh
  // entries it returned), floored at the entries we actually have in hand.
  ev.harvest = {
    seen: Math.max(harvest.seen ?? 0, combined.length),
    fresh: fresh.length,
    recovery: 0,
  };
  if (fresh.length === 0) {
    const lastSyncedAt = await persistWatermark(source, {
      full: baseline.full,
      newestId: null,
      total: baseline.total,
    });
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
    message: `Queueing ${fresh.length} item${fresh.length === 1 ? "" : "s"}…`,
    progress: { current: 0, total: fresh.length },
  });

  // One batched, transactional insert for the whole harvest instead of
  // pLimit(8) per-URL round-trips.
  const bulk = await enqueueSavesBulk(
    fresh.map((entry) => ({ url: entry.url })),
    { trigger: `sync:${source}` },
  );
  const succeeded = bulk.created + bulk.existing;
  ev.enqueue = { succeeded, failed: bulk.failed };
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  const lastSyncedAt = await persistWatermark(source, {
    full: baseline.full,
    newestId: fresh[0]?.sourceId ?? null,
    total: baseline.total + bulk.created,
  });
  emit({
    source,
    state: "done",
    message: `Queued ${succeeded} item${succeeded === 1 ? "" : "s"} for ingest.`,
    progress: { current: fresh.length, total: fresh.length },
    lastSyncedAt,
    lastError: null,
  });
}

async function syncTwitter(
  signal: AbortSignal,
  ev: SyncRunEvent,
  maxItems?: number,
  forceFull = false,
): Promise<void> {
  const source: Source = "twitter";
  const db = await getDb();
  const baseline = await loadSyncBaseline(source, forceFull);
  const knownIds = baseline.knownIds;
  // Previously-failed tweets we can reseed from GraphQL data when they reappear.
  const failedRows = await db
    .select({ sourceId: saves.sourceId })
    .from(saves)
    .where(and(eq(saves.source, source), eq(saves.status, "failed")));
  const failedSourceIds = new Set<string>(failedRows.map((r) => r.sourceId));
  log.info(
    `[pond sync:twitter] starting; ${baseline.total} tweets already in library (${failedSourceIds.size} failed, ${baseline.full ? "full" : `incremental ${knownIds.size}-id window`})`,
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
    if (harvest.reason === "rate_limited") {
      const waitMin = harvest.retryAfterSec
        ? Math.max(1, Math.round(harvest.retryAfterSec / 60))
        : null;
      await patchSourceSync(source, { lastError: "rate_limited" });
      emit({
        source,
        state: "paused",
        message: waitMin
          ? `Twitter asked us to slow down — paused ~${waitMin} min to protect your account.`
          : "Twitter asked us to slow down — paused to protect your account.",
        lastError: "rate_limited",
      });
      ev.outcome = "rate_limited";
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
    const lastSyncedAt = await persistWatermark(source, {
      full: baseline.full,
      newestId: null,
      total: baseline.total,
    });
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

  // Batched insert for the whole bookmark harvest (fresh + recovery), each
  // carrying its GraphQL seed so harvest_metadata can skip a re-scrape. Recovery
  // items already exist, so the bulk path routes them to the reseed path.
  const queue = [...fresh, ...recovery];
  const bulk = await enqueueSavesBulk(
    queue.map((entry) => {
      const seed = buildTwitterBookmarkSeed(entry) ?? undefined;
      return { url: entry.url, ...(seed ? { seed } : {}) };
    }),
    { trigger: "sync:twitter" },
  );
  const succeeded = bulk.created + bulk.existing;
  ev.enqueue = { succeeded, failed: bulk.failed };
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  const lastSyncedAt = await persistWatermark(source, {
    full: baseline.full,
    newestId: fresh[0]?.tweetId ?? null,
    total: baseline.total + bulk.created,
  });
  emit({
    source,
    state: "done",
    message:
      recovery.length > 0
        ? `Queued ${fresh.length} new + recovered ${recovery.length} failed.`
        : `Queued ${succeeded} bookmark${succeeded === 1 ? "" : "s"} for ingest.`,
    progress: { current: total, total },
    lastSyncedAt,
    lastError: null,
  });
}
