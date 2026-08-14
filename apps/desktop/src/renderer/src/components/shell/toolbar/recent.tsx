import { IconClockRotateClockwiseOutline18 as RecentIcon } from "@pond/icons/outline/18";
import {
  humanizeError,
  useSaveQueue,
} from "@/components/settings/funnel/lib/queue";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import { useActivityEntries } from "@/stores/activity";
import { bindPanel, closeThen, openFunnel, type Panel } from "./lib";
import { Empty, List, Row, StatusPanel } from "./panel";

interface RecentPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
}

export function RecentPanel({ open, onOpenChange }: RecentPanelProps) {
  const { saved } = useSaveQueue();
  const activity = useActivityEntries();
  const recent = open
    ? activity.filter((e) => e.state !== "running").slice(0, 8)
    : [];
  const recentSaves = open ? saved.slice(0, 5) : [];
  const goFunnel = closeThen(onOpenChange, openFunnel);

  return (
    <StatusPanel
      open={open}
      onOpenChange={bindPanel(onOpenChange, "recent")}
      heading="Recent"
      icon={<RecentIcon />}
    >
      {recentSaves.length === 0 && recent.length === 0 ? (
        <Empty>No recent activity</Empty>
      ) : (
        <List>
          {recentSaves.map((row) => (
            <Row
              key={row.save.id}
              title={row.name}
              subtitle={row.error ? humanizeError(row.error) : "Saved"}
              meta={relativeTimeFromMs(row.save.ingestCompletedAt ?? null)}
              onClick={goFunnel}
            />
          ))}
          {recent.map((entry) => (
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
