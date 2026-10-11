import {
  IconArrowDown,
  IconArrowUpRight,
  IconBan,
  IconCircleCheck,
  IconCircleWarning,
  IconCopy,
  IconHistory,
  IconTrashXmark,
  IconXmark,
} from "@pond/icons";
import { Button, Tooltip } from "@pond/ui";
import type {
  DownloadActivity,
  DownloadPhase,
} from "@shared/download-activity";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import {
  canSkipDownload,
  canTrashDownload,
  skipDownloadRows,
  trashDownloadRows,
} from "@/features/downloads/components/lib/actions";
import {
  useDownloadActivity,
  useDownloadClock,
} from "@/features/downloads/hooks/use-download-activity";
import {
  DOWNLOAD_PHASE_LABELS,
  downloadActivityForSave,
  formatDuration,
} from "@/features/downloads/lib/download-progress";
import { projectLiveDownloads } from "@/features/downloads/lib/status-feed/downloads";
import {
  libraryChrome,
  useInspectorMode,
  useRightPane,
} from "@/features/library";
import { openSave } from "@/features/saves/navigation";
import { ensureSaves, pool, useSave } from "@/features/saves/pool";
import { Section } from "@/shared/components/inspector-section";
import {
  type DownloadInspectorTask,
  downloadInspectorDetails,
} from "./inspector-model";
import styles from "./styles.module.css";

function HeaderIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label} side="bottom">
      <Button
        type="button"
        icon
        size="sm"
        variant="ghost"
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export function DownloadInspector({ saveId }: { saveId: string }) {
  const save = useSave(saveId);
  const pane = useRightPane();
  const mode = useInspectorMode();
  const active = pane === "inspector" && mode === "download";
  const hydration = useQuery({
    queryKey: ["downloads.inspectSave", saveId],
    enabled: active && !save,
    queryFn: async () => {
      await ensureSaves([saveId]);
      if (!pool.get(saveId)) throw new Error("Save is unavailable");
      return true;
    },
  });
  const query = useDownloadActivity(active);
  const latestActivity = downloadActivityForSave(query.data ?? [], saveId);
  const activity =
    save?.status === "ingesting" && latestActivity?.state !== "running"
      ? undefined
      : latestActivity;
  const now = useDownloadClock(active && activity?.state === "running");
  const row = save ? projectLiveDownloads([save])[0] : undefined;
  return (
    <DownloadInspectorView
      activity={
        query.isPending
          ? { status: "loading" }
          : { status: query.isError ? "error" : "ready", activity }
      }
      save={
        save
          ? {
              status: "ready",
              tasks: downloadInspectorDetails(save, now).tasks,
              fallbackError: row?.error ?? undefined,
            }
          : { status: hydration.isError ? "error" : "loading" }
      }
      onClose={libraryChrome.closeRightPane}
      onOpenSave={
        save?.status === "complete" ? () => openSave(saveId) : undefined
      }
      onSkip={
        row && canSkipDownload(row) ? () => skipDownloadRows([row]) : undefined
      }
      onTrash={
        row && canTrashDownload(row)
          ? () => trashDownloadRows([row])
          : undefined
      }
      onCopyError={
        row?.error
          ? () => {
              void window.pond.query("clipboard.writeText", {
                text: row.error ?? "",
              });
            }
          : undefined
      }
      onRetry={() => {
        if (!save) void hydration.refetch();
        void query.refetch();
      }}
    />
  );
}

/** Live activity polling; a failed refetch keeps the last snapshot visible. */
export type DownloadInspectorActivityState =
  | { status: "loading" }
  | { status: "ready" | "error"; activity?: DownloadActivity };

export type DownloadInspectorSaveState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      tasks: DownloadInspectorTask[];
      fallbackError?: string;
    };

interface DownloadInspectorViewProps {
  activity: DownloadInspectorActivityState;
  save: DownloadInspectorSaveState;
  onClose: () => void;
  onOpenSave?: () => void;
  onSkip?: () => void;
  onTrash?: () => void;
  onCopyError?: () => void;
  onRetry: () => void;
}

export function DownloadInspectorView({
  activity,
  save,
  onClose,
  onOpenSave,
  onSkip,
  onTrash,
  onCopyError,
  onRetry,
}: DownloadInspectorViewProps) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.heading}>Details</h2>
        <div className={styles.actions}>
          {onOpenSave && save.status === "ready" ? (
            <HeaderIcon label="Open Save" onClick={onOpenSave}>
              <IconArrowUpRight />
            </HeaderIcon>
          ) : null}
          {onSkip ? (
            <HeaderIcon label="Skip Download" onClick={onSkip}>
              <IconBan />
            </HeaderIcon>
          ) : null}
          {onTrash ? (
            <HeaderIcon label="Move to Trash" onClick={onTrash}>
              <IconTrashXmark />
            </HeaderIcon>
          ) : null}
          {onCopyError ? (
            <HeaderIcon label="Copy Error" onClick={onCopyError}>
              <IconCopy />
            </HeaderIcon>
          ) : null}
          <HeaderIcon label="Close Details" onClick={onClose}>
            <IconXmark />
          </HeaderIcon>
        </div>
      </header>
      <div className={styles.scroll}>
        {save.status === "error" ? (
          <div className={styles.notice} role="status">
            <p>Couldn't load this save.</p>
            <Button size="xs" variant="secondary" onClick={onRetry}>
              Try Again
            </Button>
          </div>
        ) : null}
        {activity.status === "error" ? (
          <div className={styles.notice} role="status">
            <p>Download activity is unavailable.</p>
            <Button size="xs" variant="secondary" onClick={onRetry}>
              Try Again
            </Button>
          </div>
        ) : null}
        <Section title="Activity">
          <ActivityPanel
            activity={
              activity.status === "loading" ? undefined : activity.activity
            }
            error={activity.status === "error"}
            fallbackError={
              save.status === "ready" ? save.fallbackError : undefined
            }
            loading={activity.status === "loading" || save.status === "loading"}
            tasks={save.status === "ready" ? save.tasks : []}
          />
        </Section>
      </div>
    </div>
  );
}

interface ActivityFeedItem {
  current: boolean;
  detail?: string;
  id: string;
  label: string;
  phase?: DownloadPhase;
  problem: boolean;
  time: string;
}

function ActivityPanel({
  activity,
  error,
  fallbackError,
  loading,
  tasks,
}: {
  activity?: DownloadActivity;
  error: boolean;
  fallbackError?: string;
  loading: boolean;
  tasks: DownloadInspectorTask[];
}) {
  const items = useMemo<ActivityFeedItem[]>(() => {
    if (activity) {
      return activity.timeline.slice(-20).map((event, index, events) => {
        const next = events[index + 1];
        const current = !next && activity.state === "running" && !error;
        const duration = (next?.at ?? activity.updatedAt) - event.at;
        return {
          id: `${event.at}-${event.phase}-${event.fileIndex ?? "task"}`,
          label: DOWNLOAD_PHASE_LABELS[event.phase],
          detail: [
            event.fileIndex ? `File ${event.fileIndex}` : null,
            current ? null : formatTiming(duration),
          ]
            .filter(Boolean)
            .join(" · "),
          phase: event.phase,
          current,
          problem: event.phase === "failed",
          time: current ? "Now" : formatEventTime(event.at),
        };
      });
    }
    return tasks.map((task) => ({
      id: task.id,
      label: task.label,
      detail: task.error ?? undefined,
      current: task.current,
      problem: task.error != null,
      time: task.statusLabel,
    }));
  }, [activity, error, tasks]);

  if (loading && items.length === 0) {
    return <EmptyPanel status>Loading download activity</EmptyPanel>;
  }

  if (items.length === 0) {
    return (
      <EmptyPanel>
        {fallbackError ?? "No recent activity is available for this download."}
      </EmptyPanel>
    );
  }

  return (
    <section aria-label="Activity log">
      <ol className={styles["activity-feed"]}>
        <li className={styles["feed-date"]}>
          <span className={styles["feed-date-icon"]} aria-hidden="true">
            <IconHistory />
          </span>
          <span>This run</span>
        </li>
        {items.map((item) => (
          <li
            className={styles["feed-event"]}
            data-current={item.current || undefined}
            data-problem={item.problem || undefined}
            key={item.id}
          >
            <span className={styles["feed-icon"]} aria-hidden="true">
              {item.problem ? (
                <IconCircleWarning />
              ) : item.current ? (
                item.phase === "receiving" ? (
                  <IconArrowDown />
                ) : (
                  <IconHistory />
                )
              ) : (
                <IconCircleCheck />
              )}
            </span>
            <span className={styles["feed-copy"]}>
              <span className={styles["feed-line"]}>
                <strong>{item.label}</strong>
                {item.detail && !item.problem ? (
                  <span>{item.detail}</span>
                ) : null}
                <time>{item.time}</time>
              </span>
              {item.problem && item.detail ? (
                <span className={styles["feed-note"]}>{item.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EmptyPanel({
  children,
  status = false,
}: {
  children: ReactNode;
  status?: boolean;
}) {
  return (
    <p className={styles.empty} role={status ? "status" : undefined}>
      {children}
    </p>
  );
}

function formatEventTime(value: number): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTiming(ms: number): string {
  return ms < 1_000 ? `${Math.max(0, Math.round(ms))} ms` : formatDuration(ms);
}
