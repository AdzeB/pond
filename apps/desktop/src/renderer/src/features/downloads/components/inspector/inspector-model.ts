import type { TaskStatus } from "@pond/schema/db";
import type { Save } from "@/features/saves/types";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import { formatDuration } from "../../lib/download-progress";
import { humanizeError, stageLabel } from "../../lib/status-feed/queue";

export interface DownloadInspectorTask {
  id: string;
  label: string;
  status: TaskStatus;
  statusLabel: string;
  error: string | null;
  current: boolean;
}

export interface DownloadInspectorProperty {
  label: string;
  value: string;
}

export interface DownloadInspectorDetails {
  tasks: DownloadInspectorTask[];
  properties: DownloadInspectorProperty[];
}

function taskStatusLabel(status: TaskStatus, retrying: boolean): string {
  if (status === "running") return "Now";
  if (status === "done") return "Done";
  if (status === "pending") return "Waiting";
  if (status === "deferred") return retrying ? "Trying again" : "Parked";
  if (status === "blocked") return "Authentication required";
  if (status === "cancelled") return "Cancelled";
  if (status === "dead") return "Stopped";
  return "Stopped";
}

export function downloadInspectorDetails(
  save: Save,
  now: number,
): DownloadInspectorDetails {
  const tasks = save.tasks ?? [];
  const currentIndex = tasks.findIndex(
    (task) => task.status === "running" || task.status === "dead",
  );
  const mapped: DownloadInspectorTask[] = tasks.map((task, index) => ({
    id: `${task.op}-${index}`,
    label: stageLabel(task.op, save.source),
    status: task.status,
    statusLabel: taskStatusLabel(
      task.status,
      task.status === "deferred" && task.deferredReason === "retry_backoff",
    ),
    error:
      task.lastError && task.status !== "done"
        ? humanizeError(task.lastError)
        : null,
    current: currentIndex === index && task.status === "running",
  }));

  const properties: DownloadInspectorProperty[] = [];
  const attempts = tasks.reduce((max, task) => Math.max(max, task.attempts), 0);
  const maxAttempts = tasks.reduce(
    (max, task) => Math.max(max, task.maxAttempts),
    0,
  );
  if (attempts > 0) {
    properties.push({
      label: "Attempts",
      value:
        maxAttempts > 0 ? `${attempts} of ${maxAttempts}` : String(attempts),
    });
  }
  const started = save.ingestStartedAt ?? save.savedAt ?? save.createdAt;
  if (started) {
    properties.push({
      label: "Started",
      value: relativeTimeFromMs(started),
    });
  }
  if (save.status === "complete" && save.ingestCompletedAt) {
    properties.push({
      label: "Finished",
      value: relativeTimeFromMs(save.ingestCompletedAt),
    });
  }
  const retryAt = tasks.find(
    (task) =>
      (task.status === "blocked" ||
        task.status === "pending" ||
        task.status === "deferred") &&
      task.nextRunAt > now,
  )?.nextRunAt;
  if (retryAt) {
    properties.push({
      label: "Retry",
      value: `In ${formatDuration(retryAt - now)}`,
    });
  }
  return { tasks: mapped, properties };
}
