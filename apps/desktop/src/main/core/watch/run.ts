import type { Source, WatchedAccount } from "@pond/schema/db";
import { saves } from "@pond/schema/db";
import type { SyncRunEvent } from "@pond/schema/events";
import { and, count, eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { commitEvent, startSyncEvent, toErrorInfo } from "../../lib/wide-event";
import { enqueueSavesBulk } from "../pipeline/enqueue-bulk";
import { isSyncBlockedByStorageGuard } from "../storage-watcher";
import { listAccountsForSource, partitionForAccount } from "../sync/accounts";
import { emit, inFlight } from "../sync/sync-status";
import {
  getWatch,
  getWatchSync,
  listWatches,
  patchWatchSync,
} from "../sync/watches";
import { listArenaWatch } from "./arena";
import { listCosmosWatch } from "./cosmos-scrape";
import { listPinterestWatch } from "./pinterest-rss";
import { listProfileWatch } from "./profile-scrape";
import { WATCH_NEEDS_SESSION, type WatchHarvestResult } from "./types";
import { listYtdlpWatch } from "./ytdlp-list";

// Watch engine: poll a watched public account for new posts and feed fresh
// URLs into the normal ingest pipeline, attributed to the watch's id. Runs
// share the sync-status channel and in-flight registry (keyed by watch id), so
// the renderer's sync monitor and cancel plumbing work unchanged.

interface WatchOptions {
  trigger?: "manual" | "cron";
}

const WATCH_WATCHDOG_MS = 10 * 60_000;

// Cap the very first check of a watch so pointing Pond at a 5k-block channel
// doesn't ingest its entire history — only what's new from here on.
const FIRST_CHECK_CAP = 30;

export async function watchAll(opts: WatchOptions = {}): Promise<void> {
  const watches = await listWatches();
  if (watches.length === 0) return;
  // Same platform runs back to back (shared, IP-based rate limits); different
  // platforms run concurrently.
  const bySource = new Map<Source, WatchedAccount[]>();
  for (const watch of watches) {
    const list = bySource.get(watch.source) ?? [];
    list.push(watch);
    bySource.set(watch.source, list);
  }
  await Promise.all(
    Array.from(bySource.values()).map(async (group) => {
      for (const watch of group) {
        await watchNow(watch.id, opts).catch((err) =>
          log.warn("[pond watch] watchNow threw", watch.id, err),
        );
      }
    }),
  );
}

export async function watchNow(
  watchId: string,
  opts: WatchOptions = {},
): Promise<void> {
  const watch = await getWatch(watchId);
  if (!watch) {
    log.warn("[pond watch] unknown watch, skipping", watchId);
    return;
  }
  const { source } = watch;
  const existing = inFlight.get(watchId);
  if (existing) {
    log.info(`[pond watch] already running, ignoring ${source}/${watchId}`);
    return;
  }
  if (isSyncBlockedByStorageGuard()) {
    emit({
      accountId: watchId,
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
    log.warn(`[pond watch] watchdog tripped for ${source}/${watchId}`);
    controller.abort();
  }, WATCH_WATCHDOG_MS);
  const startedAt = Date.now();
  inFlight.set(watchId, { controller, startedAt, watchdog, source });
  void patchWatchSync(watchId, {
    runningSince: new Date(startedAt).toISOString(),
  }).catch(() => {});
  const ev: SyncRunEvent = startSyncEvent({
    source,
    accountId: watchId,
    trigger: opts.trigger ?? "manual",
    outcome: "ok",
  });
  emit({
    accountId: watchId,
    source,
    state: "running",
    message: `Checking @${watch.handle}…`,
  });
  try {
    await runWatch(watch, controller.signal, ev);
    if (controller.signal.aborted) {
      ev.outcome = "aborted";
      const cfg = await getWatchSync(watchId);
      emit({
        accountId: watchId,
        source,
        state: watchdogTripped ? "error" : "idle",
        message: watchdogTripped ? "Check timed out." : "Check stopped.",
        lastSyncedAt: cfg.lastSyncedAt,
        lastError: watchdogTripped ? "watchdog_timeout" : cfg.lastError,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("[pond watch] fatal error", source, watchId, err);
    await patchWatchSync(watchId, { lastError: msg });
    emit({
      accountId: watchId,
      source,
      state: "error",
      message: msg,
      lastError: msg,
    });
    ev.outcome = "error";
    ev.error = toErrorInfo(err);
  } finally {
    const entry = inFlight.get(watchId);
    if (entry) clearTimeout(entry.watchdog);
    inFlight.delete(watchId);
    void patchWatchSync(watchId, { runningSince: null }).catch(() => {});
    ev.durationMs = Date.now() - startedAt;
    ev.lockHeldMs = ev.durationMs;
    ev.watchdogTripped = watchdogTripped;
    if (watchdogTripped) ev.outcome = "aborted";
    void commitEvent(ev);
  }
}

async function runWatch(
  watch: WatchedAccount,
  signal: AbortSignal,
  ev: SyncRunEvent,
): Promise<void> {
  const { source, id: watchId } = watch;
  const cfg = await getWatchSync(watchId);
  const firstCheck = cfg.lastFullSyncAt === null;

  const harvest = await harvestWatch(watch, signal);
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }
  if (!harvest.ok) {
    if (harvest.reason === "auth_required") {
      await patchWatchSync(watchId, { lastError: "auth_required" });
      emit({
        accountId: watchId,
        source,
        state: "auth_required",
        message: `Connect a ${source} account to keep watching @${watch.handle}.`,
        lastError: "auth_required",
      });
      ev.outcome = "auth_required";
      return;
    }
    if (harvest.reason === "rate_limited") {
      await patchWatchSync(watchId, { lastError: "rate_limited" });
      emit({
        accountId: watchId,
        source,
        state: "paused",
        message: "Rate limited — will retry on the next check.",
        lastError: "rate_limited",
      });
      ev.outcome = "rate_limited";
      return;
    }
    const message =
      harvest.reason === "not_found"
        ? `Couldn't find @${watch.handle} on ${source}.`
        : `Check failed: ${harvest.reason}.`;
    await patchWatchSync(watchId, { lastError: harvest.reason });
    emit({
      accountId: watchId,
      source,
      state: "error",
      message,
      lastError: harvest.reason,
    });
    ev.outcome = "error";
    ev.error = { name: "WatchHarvestError", message: harvest.reason };
    return;
  }

  // Dedupe against every save on this source (any account): if an item is
  // already in the library the watch shouldn't re-ingest it, and
  // enqueueSavesBulk would only route it through the reseed path anyway.
  const db = await getDb();
  const knownRows = await db
    .select({ sourceId: saves.sourceId })
    .from(saves)
    .where(eq(saves.source, source));
  const knownIds = new Set(knownRows.map((r) => r.sourceId));
  const totalRow = await db
    .select({ c: count() })
    .from(saves)
    .where(and(eq(saves.source, source), eq(saves.accountId, watchId)))
    .get();
  const ownedTotal = totalRow?.c ?? 0;

  const allFresh = harvest.entries.filter((e) => !knownIds.has(e.sourceId));
  const fresh = firstCheck ? allFresh.slice(0, FIRST_CHECK_CAP) : allFresh;
  if (firstCheck && allFresh.length > fresh.length) {
    log.info(
      `[pond watch:${source}] first check cap: enqueueing ${fresh.length} of ${allFresh.length} fresh items`,
    );
  }
  ev.harvest = {
    seen: harvest.entries.length,
    fresh: fresh.length,
    recovery: 0,
  };

  if (fresh.length === 0) {
    const lastSyncedAt = await persistWatchWatermark(watchId, {
      // A first check that listed nothing shouldn't burn the first-check
      // flag: if the listing was broken (or the page empty), the next check
      // that does see items must still be capped, not flood the library.
      firstCheck: firstCheck && harvest.entries.length > 0,
      newestId: null,
      total: ownedTotal,
    });
    emit({
      accountId: watchId,
      source,
      state: "done",
      message: "Nothing new.",
      lastSyncedAt,
      lastError: null,
    });
    ev.outcome = "noop";
    ev.enqueue = { succeeded: 0, failed: 0 };
    return;
  }

  emit({
    accountId: watchId,
    source,
    state: "running",
    message: `Queueing ${fresh.length} new post${fresh.length === 1 ? "" : "s"}…`,
    progress: { current: 0, total: fresh.length },
  });
  const bulk = await enqueueSavesBulk(
    fresh.map((entry) => ({ url: entry.url })),
    { trigger: `watch:${source}`, accountId: watchId },
  );
  ev.enqueue = { succeeded: bulk.created + bulk.existing, failed: bulk.failed };
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  const lastSyncedAt = await persistWatchWatermark(watchId, {
    firstCheck,
    newestId: fresh[0]?.sourceId ?? null,
    total: ownedTotal + bulk.created,
  });
  emit({
    accountId: watchId,
    source,
    state: "done",
    message: `Queued ${bulk.created} new post${bulk.created === 1 ? "" : "s"}.`,
    progress: { current: fresh.length, total: fresh.length },
    lastSyncedAt,
    lastError: null,
  });
}

async function harvestWatch(
  watch: WatchedAccount,
  signal: AbortSignal,
): Promise<WatchHarvestResult> {
  const { source, handle, kind } = watch;
  if (source === "arena") return listArenaWatch(handle, kind);
  if (source === "youtube" || source === "tiktok") {
    return listYtdlpWatch(source, handle, kind, signal);
  }
  if (source === "pinterest") return listPinterestWatch(handle, kind);
  if (source === "cosmos") return listCosmosWatch(handle);
  if (WATCH_NEEDS_SESSION.includes(source)) {
    const partition = await resolveViaPartition(watch);
    if (!partition) return { ok: false, reason: "auth_required" };
    return listProfileWatch(source, handle, partition, kind);
  }
  return { ok: false, reason: "unknown" };
}

// The session a scrape-based check borrows: the pinned `via` account when it
// still exists, else the first connected account on the source.
async function resolveViaPartition(
  watch: WatchedAccount,
): Promise<string | null> {
  const accounts = await listAccountsForSource(watch.source);
  const via = watch.via ? accounts.find((a) => a.id === watch.via) : undefined;
  const chosen = via ?? accounts[0];
  return chosen ? partitionForAccount(chosen.id) : null;
}

async function persistWatchWatermark(
  watchId: string,
  opts: { firstCheck: boolean; newestId: string | null; total: number },
): Promise<string> {
  const lastSyncedAt = new Date().toISOString();
  await patchWatchSync(watchId, {
    lastSyncedAt,
    lastError: null,
    knownCount: opts.total,
    ...(opts.newestId ? { highWaterMark: opts.newestId } : {}),
    ...(opts.firstCheck ? { lastFullSyncAt: lastSyncedAt } : {}),
  });
  return lastSyncedAt;
}
