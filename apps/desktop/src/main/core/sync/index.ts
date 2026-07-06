import type { Source } from "@pond/schema/db";
import type { SyncRunEvent } from "@pond/schema/events";
import log from "electron-log/main.js";
import { commitEvent, startSyncEvent, toErrorInfo } from "../../lib/wide-event";
import { isSourceConnected } from "../refresh/scrape-window";
import { isSyncBlockedByStorageGuard } from "../storage-watcher";
import { LIST_HARVEST_SOURCES, syncListSource } from "./run-list";
import { syncTwitter } from "./run-twitter";
import { getSourceSync, patchSourceSync } from "./sync-baseline";
import { emit, inFlight } from "./sync-status";

export { getSourceSync } from "./sync-baseline";
export {
  cancelSync,
  isSyncing,
  type SyncStatusUpdate,
  subscribeToSyncStatus,
} from "./sync-status";

interface SyncOptions {
  trigger?: "manual" | "cron";
  // Cap on new items enqueued per source; the full list is still walked.
  maxItems?: number;
  // Ignore the incremental watermark and walk the whole remote list (loads the
  // full known-id set, disables early-stop). For drift recovery.
  forceFull?: boolean;
}

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

const SYNCABLE_SOURCES: readonly Source[] = [
  "twitter",
  "youtube",
  "cosmos",
  "arena",
  "pinterest",
  "instagram",
  "tiktok",
];

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
