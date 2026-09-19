import type { DownloadRow } from "@/features/downloads/lib/status-feed";

export type DownloadTableStatus =
  | "progress"
  | "failed"
  | "complete"
  | "paused"
  | "cancelled"
  | "skipped";

const STATUS_LABELS = {
  progress: "In Progress",
  failed: "Failed",
  complete: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
  skipped: "Skipped",
} satisfies Record<DownloadTableStatus, string>;

function isDownloadWaiting(row: DownloadRow): boolean {
  return (
    row.status === "pending" ||
    row.status === "blocked" ||
    row.status === "retrying"
  );
}

export function isDownloadStopped(row: DownloadRow, paused: boolean): boolean {
  return paused && isDownloadWaiting(row) && !row.interactive;
}

export function isDownloadProcessing(row: DownloadRow): boolean {
  return (
    row.op === "ensure_poster" ||
    row.op === "render_text_cover" ||
    row.op === "finalize"
  );
}

export function downloadTableStatus(
  row: DownloadRow,
  paused: boolean,
): DownloadTableStatus {
  if (row.status === "complete") return "complete";
  if (row.status === "failed" || row.status === "blocked") return "failed";
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "skipped") return "skipped";
  if (isDownloadStopped(row, paused)) return "paused";
  return "progress";
}

export function downloadStatusLabel(row: DownloadRow, paused: boolean): string {
  return STATUS_LABELS[downloadTableStatus(row, paused)];
}
