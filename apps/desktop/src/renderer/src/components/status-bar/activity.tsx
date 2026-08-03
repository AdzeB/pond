import { IconClockRotateClockwiseOutline18 as ActivityIcon } from "@pond/icons/outline/18";
import {
  humanizeError,
  useSaveQueue,
} from "@/components/settings-funnel/lib/queue";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import { useActivityEntries } from "@/stores/activity";
import { openFunnel, type Panel } from "./lib";
import { Empty, PanelFooter, Row, Section, StatusPanel } from "./panel";
import styles from "./styles.module.css";

interface ActivityPanelProps {
  open: boolean;
  onOpenChange: (next: Panel | null) => void;
}

const PREVIEW_LIMIT = 20;

export function ActivityPanel({ open, onOpenChange }: ActivityPanelProps) {
  const { saving, saved } = useSaveQueue();
  const activity = useActivityEntries();
  const running = activity.filter((e) => e.state === "running");
  const recent = activity.filter((e) => e.state !== "running").slice(0, 8);
  const recentSaves = saved.slice(0, 5);
  const savingPreview = saving.slice(0, PREVIEW_LIMIT);
  const runningPreview = running.slice(
    0,
    Math.max(0, PREVIEW_LIMIT - savingPreview.length),
  );

  const tone =
    saving.length > 0 || running.length > 0 ? ("run" as const) : null;
  const close = () => onOpenChange(null);
  const goFunnel = () => {
    close();
    openFunnel();
  };

  return (
    <StatusPanel
      open={open}
      onOpenChange={(next) => onOpenChange(next ? "activity" : null)}
      label="Activity"
      icon={<ActivityIcon />}
      tone={tone}
    >
      <Section
        title="In progress"
        meta={
          saving.length + running.length > 0
            ? String(saving.length + running.length)
            : undefined
        }
      >
        {saving.length === 0 && running.length === 0 ? (
          <Empty>Nothing in progress</Empty>
        ) : (
          <div className={styles.list}>
            {savingPreview.map((row) => (
              <Row
                key={row.save.id}
                title={row.name}
                subtitle={row.stage ?? "Saving"}
                meta={`${Math.round(row.progress * 100)}%`}
                tone="run"
                onClick={goFunnel}
              />
            ))}
            {runningPreview.map((entry) => (
              <Row
                key={entry.id}
                title={entry.label}
                subtitle={entry.message}
                meta="now"
                tone="run"
                onClick={goFunnel}
              />
            ))}
          </div>
        )}
      </Section>
      <Section title="Recent">
        {recentSaves.length === 0 && recent.length === 0 ? (
          <Empty>No recent activity</Empty>
        ) : (
          <div className={styles.list}>
            {recentSaves.map((row) => (
              <Row
                key={row.save.id}
                title={row.name}
                subtitle={row.error ? humanizeError(row.error) : "Saved"}
                meta={relativeTimeFromMs(row.save.ingestCompletedAt ?? null)}
                tone={row.error ? "err" : "ok"}
                onClick={goFunnel}
              />
            ))}
            {recent.map((entry) => (
              <Row
                key={entry.id}
                title={entry.label}
                subtitle={entry.message}
                meta={relativeTimeFromMs(entry.endedAt ?? entry.startedAt)}
                tone={entry.state === "error" ? "err" : "ok"}
                onClick={goFunnel}
              />
            ))}
          </div>
        )}
      </Section>
      <PanelFooter label="Open Saves" onClick={goFunnel} />
    </StatusPanel>
  );
}
