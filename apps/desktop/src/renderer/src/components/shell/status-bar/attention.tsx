import { IconTriangleWarningOutline18 as WarningIcon } from "@pond/icons/outline/18";
import { useMemo } from "react";
import {
  humanizeError,
  useSaveQueue,
} from "@/components/settings/funnel/lib/queue";
import type { AccountRow } from "@/hooks/use-accounts";
import type { WatchRow } from "@/hooks/use-watches";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import { useActivityEntries } from "@/stores/activity";
import type { SyncAccountStatus } from "@/stores/sync-monitor";
import {
  buildEntities,
  openFunnel,
  openSources,
  type Panel,
  type StatusEntity,
} from "./lib";
import { Empty, List, PanelFooter, Row, Section, StatusPanel } from "./panel";

interface AttentionPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
  accounts: AccountRow[];
  watches: WatchRow[];
  byAccount: Record<string, SyncAccountStatus>;
}

export function AttentionPanel({
  open,
  onOpenChange,
  accounts,
  watches,
  byAccount,
}: AttentionPanelProps) {
  const entities = useMemo(
    () => buildEntities(accounts, watches, byAccount),
    [accounts, watches, byAccount],
  );
  const alerts = entities.filter((e) => e.tone === "warn");
  const syncErrors = entities.filter((e) => e.tone === "err");
  const { failed } = useSaveQueue();
  const activity = useActivityEntries();
  const activityErrors = activity
    .filter((e) => e.state === "error")
    .slice(0, 5);

  const hasAttention =
    alerts.length > 0 || syncErrors.length > 0 || failed.length > 0;
  const tone = hasAttention
    ? syncErrors.length > 0 || failed.length > 0
      ? ("err" as const)
      : ("warn" as const)
    : null;

  const close = () => onOpenChange(null);
  const goSources = () => {
    close();
    openSources();
  };
  const goFunnel = () => {
    close();
    openFunnel();
  };

  return (
    <StatusPanel
      open={open}
      onOpenChange={(next) => onOpenChange(next ? "attention" : null)}
      label="Attention"
      icon={<WarningIcon />}
      tone={tone}
    >
      <Section title="Alerts">
        {alerts.length === 0 ? (
          <Empty>No active alerts</Empty>
        ) : (
          <List>
            {alerts.map((entity) => (
              <EntityRow key={entity.id} entity={entity} onClick={goSources} />
            ))}
          </List>
        )}
      </Section>
      <Section title="Errors">
        {syncErrors.length === 0 &&
        failed.length === 0 &&
        activityErrors.length === 0 ? (
          <Empty>No recent errors</Empty>
        ) : (
          <List>
            {syncErrors.map((entity) => (
              <EntityRow key={entity.id} entity={entity} onClick={goSources} />
            ))}
            {failed.map((row) => (
              <Row
                key={row.save.id}
                title={row.name}
                subtitle={humanizeError(row.error)}
                meta="save"
                tone="err"
                onClick={goFunnel}
              />
            ))}
            {activityErrors.map((entry) => (
              <Row
                key={entry.id}
                title={entry.label}
                subtitle={entry.message}
                meta={relativeTimeFromMs(entry.endedAt ?? entry.startedAt)}
                tone="err"
                onClick={goFunnel}
              />
            ))}
          </List>
        )}
      </Section>
      {hasAttention ? (
        <PanelFooter
          label={failed.length > 0 ? "Open Saves" : "Open Sources"}
          onClick={failed.length > 0 ? goFunnel : goSources}
        />
      ) : null}
    </StatusPanel>
  );
}

function EntityRow({
  entity,
  onClick,
}: {
  entity: StatusEntity;
  onClick: () => void;
}) {
  return (
    <Row
      title={entity.title}
      subtitle={entity.model.meta}
      meta={entity.model.lastText}
      tone={entity.tone}
      onClick={onClick}
    />
  );
}
