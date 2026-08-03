import { IconArrowRotateClockwiseOutline18 as SyncIcon } from "@pond/icons/outline/18";
import { useMemo } from "react";
import type { AccountRow } from "@/hooks/use-accounts";
import type { WatchRow } from "@/hooks/use-watches";
import type { SyncAccountStatus } from "@/stores/sync-monitor";
import {
  buildEntities,
  openSources,
  type Panel,
  type StatusEntity,
} from "./lib";
import { Empty, PanelFooter, Row, Section, StatusPanel } from "./panel";
import styles from "./styles.module.css";

interface SyncPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
  accounts: AccountRow[];
  watches: WatchRow[];
  byAccount: Record<string, SyncAccountStatus>;
}

function closeAnd(openSourcesFn: () => void, close: () => void): () => void {
  return () => {
    close();
    openSourcesFn();
  };
}

export function SyncPanel({
  open,
  onOpenChange,
  accounts,
  watches,
  byAccount,
}: SyncPanelProps) {
  const entities = useMemo(
    () => buildEntities(accounts, watches, byAccount),
    [accounts, watches, byAccount],
  );
  const ongoing = entities.filter((e) => e.tone === "run");
  const rest = entities.filter((e) => e.tone !== "run");
  const tone = ongoing.length > 0 ? ("run" as const) : null;
  const close = () => onOpenChange(null);

  return (
    <StatusPanel
      open={open}
      onOpenChange={(next) => onOpenChange(next ? "sync" : null)}
      label="Sync"
      icon={<SyncIcon />}
      tone={tone}
    >
      <Section title="Ongoing">
        {ongoing.length === 0 ? (
          <Empty>No active syncs</Empty>
        ) : (
          <div className={styles.list}>
            {ongoing.map((entity) => (
              <EntityRow
                key={entity.id}
                entity={entity}
                onClick={closeAnd(openSources, close)}
              />
            ))}
          </div>
        )}
      </Section>
      <Section
        title="Sources"
        meta={rest.length > 0 ? String(rest.length) : undefined}
      >
        {rest.length === 0 ? (
          <Empty>
            {entities.length === 0 ? "No connected sources" : "All caught up"}
          </Empty>
        ) : (
          <div className={styles.list}>
            {rest.map((entity) => (
              <EntityRow
                key={entity.id}
                entity={entity}
                onClick={closeAnd(openSources, close)}
              />
            ))}
          </div>
        )}
      </Section>
      <PanelFooter
        label="Open Sources"
        onClick={closeAnd(openSources, close)}
      />
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
      subtitle={entity.model.statusText}
      meta={entity.tone === "run" ? "now" : entity.model.lastText}
      tone={entity.tone}
      onClick={onClick}
    />
  );
}
