import { IconTriangleWarningOutline18 as WarningIcon } from "@pond/icons/outline/18";
import { useMemo } from "react";
import {
  humanizeError,
  useSaveQueue,
} from "@/components/settings/funnel/lib/queue";
import { useAccounts } from "@/hooks/use-accounts";
import { useWatches } from "@/hooks/use-watches";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import { useActivityEntries } from "@/stores/activity";
import { useSyncByAccount } from "@/stores/sync-monitor";
import {
  bindPanel,
  buildEntities,
  closeThen,
  openFunnel,
  openSources,
  type Panel,
  type StatusEntity,
} from "./lib";
import { Empty, EntityRow, List, Row, StatusPanel } from "./panel";

interface ErrorsPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
}

export function ErrorsPanel({ open, onOpenChange }: ErrorsPanelProps) {
  const { accounts } = useAccounts();
  const { watches } = useWatches();
  const byAccount = useSyncByAccount();
  const entities = useMemo(
    () => (open ? buildEntities(accounts, watches, byAccount) : []),
    [open, accounts, watches, byAccount],
  );
  const { failed } = useSaveQueue();
  const activity = useActivityEntries();

  const alerts: StatusEntity[] = [];
  const syncErrors: StatusEntity[] = [];
  for (const entity of entities) {
    if (entity.tone === "warn") alerts.push(entity);
    else if (entity.tone === "err") syncErrors.push(entity);
  }

  const activityErrors = open
    ? activity.filter((e) => e.state === "error").slice(0, 5)
    : [];
  const empty =
    alerts.length === 0 &&
    syncErrors.length === 0 &&
    failed.length === 0 &&
    activityErrors.length === 0;

  const goSources = closeThen(onOpenChange, openSources);
  const goFunnel = closeThen(onOpenChange, openFunnel);

  return (
    <StatusPanel
      open={open}
      onOpenChange={bindPanel(onOpenChange, "errors")}
      heading="Last Errors"
      icon={<WarningIcon />}
    >
      {empty ? (
        <Empty>No recent errors</Empty>
      ) : (
        <List>
          {alerts.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              subtitle={entity.model.meta}
              meta={entity.model.lastText}
              onClick={goSources}
            />
          ))}
          {syncErrors.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              subtitle={entity.model.meta}
              meta={entity.model.lastText}
              onClick={goSources}
            />
          ))}
          {failed.map((row) => (
            <Row
              key={row.save.id}
              title={row.name}
              subtitle={humanizeError(row.error)}
              meta="save"
              onClick={goFunnel}
            />
          ))}
          {activityErrors.map((entry) => (
            <Row
              key={entry.id}
              title={entry.label}
              subtitle={entry.message}
              meta={relativeTimeFromMs(entry.endedAt ?? entry.startedAt)}
              onClick={goFunnel}
            />
          ))}
        </List>
      )}
    </StatusPanel>
  );
}
