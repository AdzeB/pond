import type { Save } from "@/features/saves/types";
import type { AccountRow } from "@/features/sources/hooks/use-accounts";
import type { WatchRow } from "@/features/sources/hooks/use-watches";
import type { SyncAccountStatus } from "@/features/sources/state/sync-monitor";
import type { ActivityEntry } from "./activity";
import { projectEntities, type StatusEntity } from "./entities";
import { projectQueue, type QueueRow } from "./queue";

export interface StatusFeedSnapshot {
  inProgress: {
    saving: QueueRow[];
    running: ActivityEntry[];
    busy: boolean;
  };
  recent: ActivityEntry[];
  errors: {
    alerts: StatusEntity[];
    syncErrors: StatusEntity[];
    failed: QueueRow[];
    activityErrors: ActivityEntry[];
  };
  ongoing: StatusEntity[];
}

export function projectStatusFeed(input: {
  saves: readonly Save[];
  activity: readonly ActivityEntry[];
  accounts: AccountRow[];
  watches: WatchRow[];
  byAccount: Record<string, SyncAccountStatus>;
}): StatusFeedSnapshot {
  const queue = projectQueue(input.saves);
  const running = input.activity.filter((e) => e.state === "running");
  const entities = projectEntities(
    input.accounts,
    input.watches,
    input.byAccount,
  );
  const alerts: StatusEntity[] = [];
  const syncErrors: StatusEntity[] = [];
  for (const entity of entities) {
    if (entity.tone === "warn") alerts.push(entity);
    else if (entity.tone === "err") syncErrors.push(entity);
  }
  return {
    inProgress: {
      saving: queue.saving,
      running,
      busy: queue.saving.length > 0 || running.length > 0,
    },
    recent: input.activity.filter((e) => e.state !== "running").slice(0, 8),
    errors: {
      alerts,
      syncErrors,
      failed: queue.failed,
      activityErrors: input.activity
        .filter((e) => e.state === "error")
        .slice(0, 5),
    },
    ongoing: entities.filter((e) => e.tone === "run"),
  };
}
