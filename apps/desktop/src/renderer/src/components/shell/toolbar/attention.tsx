import { IconTriangleWarningOutline18 as WarningIcon } from "@pond/icons/outline/18";
import { humanizeError, useStatusFeed } from "@/lib/status-feed";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import {
  bindPanel,
  closeThen,
  openSaveFromPanel,
  openSources,
  type Panel,
} from "./lib";
import { Empty, EntityRow, List, Row, StatusPanel } from "./panel";

interface ErrorsPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
}

export function ErrorsPanel({ open, onOpenChange }: ErrorsPanelProps) {
  const { errors } = useStatusFeed();
  const { alerts, syncErrors, failed, activityErrors } = errors;
  const empty =
    alerts.length === 0 &&
    syncErrors.length === 0 &&
    failed.length === 0 &&
    activityErrors.length === 0;

  const goSources = closeThen(onOpenChange, openSources);

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
              onClick={closeThen(onOpenChange, () =>
                openSaveFromPanel(row.save.id),
              )}
            />
          ))}
          {activityErrors.map((entry) => (
            <Row
              key={entry.id}
              title={entry.label}
              subtitle={entry.message}
              meta={relativeTimeFromMs(entry.endedAt ?? entry.startedAt)}
            />
          ))}
        </List>
      )}
    </StatusPanel>
  );
}
