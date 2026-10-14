import type {
  DownloadActivity,
  DownloadPhase,
} from "@shared/download-activity";

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  const value = Math.max(0, bytes);
  const index = Math.min(3, Math.floor(Math.log10(Math.max(1, value)) / 3));
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: index === 0 ? 0 : 1 }).format(value / 1_000 ** index)} ${units[index]}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1_000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`;
}

const DOWNLOAD_PHASE_LABELS = {
  starting: "Preparing download",
  waiting: "Waiting on source",
  harvesting: "Reading page",
  capturing: "Capturing page",
  requesting: "Waiting for server response",
  receiving: "Downloading media",
  processing: "Processing media",
  saving: "Writing files",
  finalizing: "Saving to your library",
  completed: "Finished",
  failed: "Stopped",
} satisfies Record<DownloadPhase, string>;

export function downloadActivityForSave(
  activities: readonly DownloadActivity[],
  saveId: string,
): DownloadActivity | undefined {
  let result: DownloadActivity | undefined;
  for (const activity of activities) {
    if (activity.saveId !== saveId) continue;
    if (
      !result ||
      (activity.state === "running" && result.state !== "running") ||
      (activity.state === result.state &&
        activity.updatedAt > result.updatedAt) ||
      (activity.state !== "running" &&
        result.state !== "running" &&
        activity.updatedAt > result.updatedAt)
    )
      result = activity;
  }
  return result;
}

export function describeDownloadActivity(
  activity: DownloadActivity,
  now: number,
) {
  const moving = activity.transfers.filter(
    (transfer) =>
      transfer.state === "receiving" || transfer.state === "requesting",
  );
  const transfer =
    moving.find((item) => item.state === "receiving") ?? moving[0];
  const transferring =
    activity.state === "running" &&
    (activity.phase === "receiving" || activity.phase === "requesting");
  const stale = transfer
    ? now -
      (transfer.lastByteAt ??
        (transfer.receivedBytes ? transfer.updatedAt : transfer.startedAt))
    : 0;
  const stalled = transferring && Boolean(transfer) && stale >= 15_000;
  const progress =
    transferring &&
    transfer?.state === "receiving" &&
    transfer.totalBytes &&
    transfer.totalBytes > 0 &&
    transfer.receivedBytes != null
      ? Math.min(1, Math.max(0, transfer.receivedBytes / transfer.totalBytes))
      : null;
  const speed =
    transferring &&
    transfer?.state === "receiving" &&
    stale < 3_000 &&
    transfer.bytesPerSecond != null
      ? `${formatBytes(transfer.bytesPerSecond)}/s`
      : null;
  let label = DOWNLOAD_PHASE_LABELS[activity.phase];
  if (
    activity.phase === "receiving" &&
    (activity.op === "fetch_video_ytdlp" ||
      transfer?.request?.contentType?.startsWith("video/"))
  )
    label = "Downloading video";
  if (activity.phase === "processing" && activity.op === "ensure_poster")
    label = "Generating thumbnail";
  if (activity.phase === "processing" && activity.op === "render_text_cover")
    label = "Rendering text cover";
  let detail: string | null = null;
  if (stalled)
    detail =
      transfer?.state === "requesting"
        ? `No response for ${formatDuration(now - transfer.startedAt)}`
        : `No data received for ${formatDuration(stale)}`;
  else if (transferring && transfer)
    detail =
      moving.length > 1
        ? `${moving.length} files active`
        : transfer.fileCount && transfer.fileCount > 1
          ? `File ${transfer.fileIndex} of ${transfer.fileCount}`
          : null;
  return { label, detail, progress, speed, stalled };
}
