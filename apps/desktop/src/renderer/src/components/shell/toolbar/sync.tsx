import { IconArrowRotateClockwiseOutline18 as SyncIcon } from "@pond/icons/outline/18";
import { useMemo } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { useWatches } from "@/hooks/use-watches";
import { useSyncByAccount } from "@/stores/sync-monitor";
import {
  bindPanel,
  buildEntities,
  closeThen,
  openSources,
  type Panel,
} from "./lib";
import { Empty, EntityRow, List, StatusPanel } from "./panel";

interface OngoingPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
}

export function OngoingPanel({ open, onOpenChange }: OngoingPanelProps) {
  const { accounts } = useAccounts();
  const { watches } = useWatches();
  const byAccount = useSyncByAccount();
  const ongoing = useMemo(() => {
    if (!open) return [];
    return buildEntities(accounts, watches, byAccount).filter(
      (e) => e.tone === "run",
    );
  }, [open, accounts, watches, byAccount]);
  const goSources = closeThen(onOpenChange, openSources);

  return (
    <StatusPanel
      open={open}
      onOpenChange={bindPanel(onOpenChange, "ongoing")}
      heading="Ongoing"
      icon={<SyncIcon />}
    >
      {ongoing.length === 0 ? (
        <Empty>No active syncs</Empty>
      ) : (
        <List>
          {ongoing.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              subtitle={entity.model.statusText}
              meta="now"
              onClick={goSources}
            />
          ))}
        </List>
      )}
    </StatusPanel>
  );
}
