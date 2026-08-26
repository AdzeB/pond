import { IconArrowRotateClockwiseOutline18 as SyncIcon } from "@pond/icons/outline/18";
import { useStatusFeed } from "@/lib/status-feed";
import { bindPanel, closeThen, openSources, type Panel } from "./lib";
import { Empty, EntityRow, List, StatusPanel } from "./panel";

interface OngoingPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
}

export function OngoingPanel({ open, onOpenChange }: OngoingPanelProps) {
  const { ongoing } = useStatusFeed();
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
