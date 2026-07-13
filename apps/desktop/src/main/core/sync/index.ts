import type { ConnectedAccount, Source } from "@pond/schema/db";
import type { SyncRunEvent } from "@pond/schema/events";
import log from "electron-log/main.js";
import { commitEvent, startSyncEvent, toErrorInfo } from "../../lib/wide-event";
import { isAccountConnected } from "../refresh/scrape-window";
import { isSyncBlockedByStorageGuard } from "../storage-watcher";
import { ensureAccountHandle } from "./account-key";
import {
  getAccount,
  getAccountSync,
  listAccounts,
  listAccountsForSource,
  patchAccountSync,
} from "./accounts";
import { LIST_HARVEST_SOURCES, syncListSource } from "./run-list";
import { syncTwitter } from "./run-twitter";
import { emit, inFlight } from "./sync-status";

export { getAccountSync } from "./accounts";
export { migrateLegacySyncPrefs } from "./migrate-legacy";
export {
  cancelAllSyncs,
  cancelSync,
  isSourceSyncing,
  isSyncing,
  type SyncStatusUpdate,
  subscribeToSyncStatus,
} from "./sync-status";

interface SyncOptions {
  trigger?: "manual" | "cron";
  /** Cap on new items enqueued per account; the full list is still walked. */
  maxItems?: number;
  /** Ignore the incremental watermark and walk the whole remote list; for drift recovery. */
  forceFull?: boolean;
}

/** Watchdog: abort a stuck sync so the slot clears; Twitter gets the loosest cap. */
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
  /** Web links are saved individually, never list-synced; present for the record total. */
  web: 20 * 60_000,
  /** Local never syncs; present only for the record total. */
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

export function isSyncableSource(source: Source): boolean {
  return SYNCABLE_SOURCES.includes(source);
}

export async function syncAllSources(opts: SyncOptions = {}): Promise<void> {
  const accounts = (await listAccounts()).filter((a) =>
    isSyncableSource(a.source),
  );
  const connected = await Promise.all(
    accounts.map(async (account) =>
      (await isAccountConnected(account).catch(() => false)) ? account : null,
    ),
  );
  const runnable = connected.filter((a): a is ConnectedAccount => a !== null);
  if (runnable.length === 0) return;

  /** Accounts on the same platform run back to back: rate limits are largely IP-based and shared, so simultaneous same-domain runs only raise risk. */
  const bySource = new Map<Source, ConnectedAccount[]>();
  for (const account of runnable) {
    const list = bySource.get(account.source) ?? [];
    list.push(account);
    bySource.set(account.source, list);
  }
  await Promise.all(
    Array.from(bySource.values()).map(async (group) => {
      for (const account of group) {
        await syncAccount(account.id, opts).catch((err) =>
          log.warn("[pond sync] syncAccount threw", account.id, err),
        );
      }
    }),
  );
}

/** Syncs every connected account on the source, sequentially; for per-platform triggers. */
export async function syncSource(
  source: Source,
  opts: SyncOptions = {},
): Promise<void> {
  const accounts = await listAccountsForSource(source);
  for (const account of accounts) {
    await syncAccount(account.id, opts).catch((err) =>
      log.warn("[pond sync] syncAccount threw", account.id, err),
    );
  }
}

export async function syncAccount(
  accountId: string,
  opts: SyncOptions = {},
): Promise<void> {
  const account = await getAccount(accountId);
  if (!account) {
    log.warn("[pond sync] unknown account, skipping", accountId);
    return;
  }
  const { source } = account;
  const existing = inFlight.get(accountId);
  if (existing) {
    const ageSec = Math.round((Date.now() - existing.startedAt) / 1000);
    log.info(
      `[pond sync] already running (${ageSec}s), ignoring ${source}/${accountId} (${opts.trigger ?? "manual"})`,
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
      accountId,
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
      `[pond sync] watchdog tripped for ${source}/${accountId} after ${Math.round(SYNC_WATCHDOG_MS[source] / 60_000)}m; aborting`,
    );
    controller.abort();
  }, SYNC_WATCHDOG_MS[source]);
  const startedAt = Date.now();
  inFlight.set(accountId, {
    controller,
    startedAt,
    watchdog,
    source,
  });
  /** Persist an in-flight marker so a crash mid-run is recoverable on next launch. @see recoverInterruptedSyncs */
  void patchAccountSync(accountId, {
    runningSince: new Date(startedAt).toISOString(),
  }).catch(() => {});
  /** One wide event per sync run, mutated then committed in the finally. */
  const ev: SyncRunEvent = startSyncEvent({
    source,
    accountId,
    trigger: opts.trigger ?? "manual",
    outcome: "ok",
  });
  emit({ accountId, source, state: "running", message: "Starting…" });
  try {
    /** Sync doesn't need the handle, but session matching and the Sources page profile picture do; one probe, then cached. */
    await ensureAccountHandle(account);
    if (source === "twitter") {
      await syncTwitter(
        account,
        controller.signal,
        ev,
        opts.maxItems,
        opts.forceFull,
      );
    } else if (LIST_HARVEST_SOURCES.has(source)) {
      await syncListSource(
        account,
        controller.signal,
        ev,
        opts.maxItems,
        opts.forceFull,
      );
    } else {
      await patchAccountSync(accountId, { lastError: "unsupported" });
      emit({
        accountId,
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
      /** Push an explicit idle so the UI clears its spinner; watchdog reports an error. */
      const cfg = await getAccountSync(accountId);
      emit({
        accountId,
        source,
        state: watchdogTripped ? "error" : "idle",
        message: watchdogTripped ? "Sync timed out." : "Sync stopped.",
        lastSyncedAt: cfg.lastSyncedAt,
        lastError: watchdogTripped ? "watchdog_timeout" : cfg.lastError,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("[pond sync] fatal error", source, accountId, err);
    await patchAccountSync(accountId, { lastError: msg });
    emit({
      accountId,
      source,
      state: "error",
      message: msg,
      lastError: msg,
    });
    ev.outcome = "error";
    ev.error = toErrorInfo(err);
  } finally {
    const entry = inFlight.get(accountId);
    if (entry) clearTimeout(entry.watchdog);
    inFlight.delete(accountId);
    void patchAccountSync(accountId, { runningSince: null }).catch(() => {});
    ev.durationMs = Date.now() - startedAt;
    ev.lockHeldMs = ev.durationMs;
    ev.watchdogTripped = watchdogTripped;
    if (watchdogTripped) ev.outcome = "aborted";
    void commitEvent(ev);
  }
}

/** An account still flagged `runningSince` at startup was interrupted by a crash; clear the stale marker so the UI doesn't show a stuck spinner. */
export async function recoverInterruptedSyncs(): Promise<string[]> {
  const recovered: string[] = [];
  for (const account of await listAccounts()) {
    const cfg = await getAccountSync(account.id);
    if (!cfg.runningSince) continue;
    recovered.push(account.id);
    await patchAccountSync(account.id, {
      runningSince: null,
      lastError: "interrupted",
    }).catch(() => {});
    emit({
      accountId: account.id,
      source: account.source,
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
