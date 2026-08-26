import { IconClockRotateClockwiseOutline18 as RecentIcon } from "@pond/icons/outline/18";
import { useStatusFeed } from "@/lib/status-feed";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import { bindPanel, type Panel } from "./lib";
import { Empty, List, Row, StatusPanel } from "./panel";

interface RecentPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
}

export function RecentPanel({ open, onOpenChange }: RecentPanelProps) {
  const { recent } = useStatusFeed();

  return (
    <StatusPanel
      open={open}
      onOpenChange={bindPanel(onOpenChange, "recent")}
      heading="Recent"
      icon={<RecentIcon />}
    >
      {recent.length === 0 ? (
        <Empty>No recent activity</Empty>
      ) : (
        <List>
          {recent.map((entry) => (
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
