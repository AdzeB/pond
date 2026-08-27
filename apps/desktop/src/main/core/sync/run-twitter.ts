import { type ConnectedAccount, type Source, saves } from "@pond/schema/db";
import type { SyncRunEvent } from "@pond/schema/events";
import { and, eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { enqueue } from "../pipeline/enqueue";
import { harvestTwitterBookmarks } from "../refresh/scrape-window";
import { partitionForAccount } from "./accounts";
import {
  loadSyncBaseline,
  patchAccountSync,
  persistWatermark,
} from "./sync-baseline";
import { emit } from "./sync-status";
import { buildTwitterBookmarkSeed } from "./twitter-seed";

export async function syncTwitter(
  account: ConnectedAccount,
  signal: AbortSignal,
  ev: SyncRunEvent,
  maxItems?: number,
  forceFull = false,
): Promise<void> {
  const source: Source = "twitter";
  const accountId = account.id;
  const db = await getDb();
  const baseline = await loadSyncBaseline(account, forceFull);
  const knownIds = baseline.knownIds;
  const failedRows = await db
    .select({ sourceId: saves.sourceId })
    .from(saves)
    .where(and(eq(saves.source, source), eq(saves.status, "failed")));
  const failedSourceIds = new Set<string>(failedRows.map((r) => r.sourceId));
  log.info(
    `[pond sync:twitter] starting for @${account.handle ?? accountId}; ${baseline.total} tweets already in library (${failedSourceIds.size} failed, ${baseline.full ? "full" : `incremental ${knownIds.size}-id window`})`,
  );
  emit({
    accountId,
    source,
    state: "running",
    message: "Reading",
  });

  const harvest = await harvestTwitterBookmarks(
    {
      knownIds: baseline.full ? [] : Array.from(knownIds),
    },
    {
      partition: partitionForAccount(accountId),
      onProgress: (p) => {
        if (signal.aborted) return;
        const message =
          p.phase === "hydrate"
            ? "Loading"
            : p.fresh > 0
              ? "Found"
              : "Scanning";
        emit({ accountId, source, state: "running", message });
      },
    },
  );
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  if (!harvest.ok) {
    if (harvest.reason === "auth_required") {
      await patchAccountSync(accountId, { lastError: "auth_required" });
      emit({
        accountId,
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
      await patchAccountSync(accountId, { lastError: "rate_limited" });
      emit({
        accountId,
        source,
        state: "paused",
        message: waitMin
          ? `Twitter asked us to slow down. Paused ~${waitMin} min to protect your account.`
          : "Twitter asked us to slow down. Paused to protect your account.",
        lastError: "rate_limited",
      });
      ev.outcome = "rate_limited";
      return;
    }
    await patchAccountSync(accountId, { lastError: harvest.reason });
    emit({
      accountId,
      source,
      state: "error",
      message: `Couldn't read bookmarks: ${harvest.reason}.`,
      lastError: harvest.reason,
    });
    ev.outcome = "error";
    ev.error = { name: "HarvestError", message: harvest.reason };
    return;
  }

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
    const lastSyncedAt = await persistWatermark(accountId, {
      full: baseline.full,
      newestId: null,
      total: baseline.total,
    });
    emit({
      accountId,
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
    accountId,
    source,
    state: "running",
    message: "Queueing",
    progress: { current: 0, total },
  });

  const queue = [...fresh, ...recovery];
  const bulk = await enqueue(
    queue.map((entry) => {
      const seed = buildTwitterBookmarkSeed(entry);
      return seed ? { url: entry.url, seed } : { url: entry.url };
    }),
    { trigger: "sync:twitter", accountId },
  );
  const succeeded = bulk.created + bulk.existing;
  ev.enqueue = { succeeded, failed: bulk.failed };
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  const lastSyncedAt = await persistWatermark(accountId, {
    full: baseline.full,
    newestId: fresh[0]?.tweetId ?? null,
    total: baseline.total + bulk.created,
  });
  emit({
    accountId,
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
