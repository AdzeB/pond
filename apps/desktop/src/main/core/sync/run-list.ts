import type { ConnectedAccount, Source } from "@pond/schema/db";
import type { SyncRunEvent } from "@pond/schema/events";
import { sourceLabel } from "@pond/schema/sources";
import log from "electron-log/main.js";
import { enqueueSavesBulk } from "../pipeline/enqueue-bulk";
import {
  harvestSourceList,
  harvestYoutubeLikedList,
} from "../refresh/scrape-window";
import { inferAccountKey, resolveAccountHandle } from "./account-key";
import { partitionForAccount } from "./accounts";
import {
  loadSyncBaseline,
  patchAccountSync,
  persistWatermark,
} from "./sync-baseline";
import { emit } from "./sync-status";

export const LIST_HARVEST_SOURCES = new Set<Source>([
  "youtube",
  "cosmos",
  "arena",
  "pinterest",
  "instagram",
  "tiktok",
]);

export async function syncListSource(
  account: ConnectedAccount,
  signal: AbortSignal,
  ev: SyncRunEvent,
  maxItems?: number,
  forceFull = false,
): Promise<void> {
  const { source } = account;
  const accountId = account.id;
  const partition = partitionForAccount(accountId);
  const baseline = await loadSyncBaseline(account, forceFull);
  const knownIds = baseline.knownIds;
  log.info(
    `[pond sync:${source}] starting for @${account.handle ?? accountId}; ${baseline.total} items already in library (${baseline.full ? "full" : `incremental, ${knownIds.size}-id window`})`,
  );
  emit({
    accountId,
    source,
    state: "running",
    message: `Reading your ${source} list`,
  });

  let accountKey: string | undefined;
  if (source === "cosmos" || source === "arena" || source === "tiktok") {
    accountKey = (await resolveAccountHandle(account)) ?? undefined;
    if (!accountKey) {
      log.info(`[pond sync:${source}] could not resolve account from session`);
      await patchAccountSync(accountId, { lastError: "auth_required" });
      emit({
        accountId,
        source,
        state: "auth_required",
        message: `Sign in to ${source} to enable background sync.`,
        lastError: "auth_required",
      });
      return;
    }
  } else if (source === "pinterest") {
    accountKey = account.handle ?? ((await inferAccountKey(source)) || "me");
  }

  /** On a full walk, hide known ids from the harvester so it doesn't early-stop at the top of the list; dedup still happens via the real `knownIds` set. */
  const harvestKnownIds = baseline.full ? [] : Array.from(knownIds);
  const harvest = await harvestSourceList(
    source,
    {
      knownIds: harvestKnownIds,
      accountKey,
    },
    {
      partition,
      onProgress: (p) => {
        emit({
          accountId,
          source,
          state: "running",
          message: `Found ${p.collected} saved items${p.fresh > 0 ? ` (${p.fresh} new)` : ""}`,
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
      await patchAccountSync(accountId, { lastError: "auth_required" });
      emit({
        accountId,
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
      await patchAccountSync(accountId, { lastError: "rate_limited" });
      emit({
        accountId,
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
    await patchAccountSync(accountId, { lastError: harvest.reason });
    emit({
      accountId,
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
    const liked = await harvestYoutubeLikedList(
      {
        knownIds: harvestKnownIds,
      },
      { partition },
    );
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
  /** Honest seen: the harvester's scanned total, floored at the entries actually in hand. */
  ev.harvest = {
    seen: Math.max(harvest.seen ?? 0, combined.length),
    fresh: fresh.length,
    recovery: 0,
  };
  if (fresh.length === 0) {
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
    `[pond sync:${source}] enqueueing ${fresh.length} new URLs into pipeline`,
  );
  emit({
    accountId,
    source,
    state: "running",
    message: `Queueing ${fresh.length} item${fresh.length === 1 ? "" : "s"}`,
    progress: { current: 0, total: fresh.length },
  });

  /** One batched, transactional insert for the whole harvest instead of per-URL round-trips. */
  const bulk = await enqueueSavesBulk(
    fresh.map((entry) => ({ url: entry.url })),
    { trigger: `sync:${source}`, accountId },
  );
  const succeeded = bulk.created + bulk.existing;
  ev.enqueue = { succeeded, failed: bulk.failed };
  if (signal.aborted) {
    ev.outcome = "aborted";
    return;
  }

  const lastSyncedAt = await persistWatermark(accountId, {
    full: baseline.full,
    newestId: fresh[0]?.sourceId ?? null,
    total: baseline.total + bulk.created,
  });
  emit({
    accountId,
    source,
    state: "done",
    message: `Queued ${succeeded} item${succeeded === 1 ? "" : "s"} for ingest.`,
    progress: { current: fresh.length, total: fresh.length },
    lastSyncedAt,
    lastError: null,
  });
}
