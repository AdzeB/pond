import {
  IconArchiveOutline18,
  IconChatBubbleOutline18,
  IconCheckOutline18,
  IconClockOutline18,
  IconDownloadOutline18,
  IconImageOutline18,
  IconMediaPauseOutline18,
  IconSparkleOutline18,
  IconTextOutline18,
  IconTriangleWarningOutline18,
  IconUserOutline18,
  IconVideoOutline18,
  IconWindowSearchOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import type { Op } from "@pond/schema/db";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";

const STAGE_ICONS = {
  harvest_metadata: IconWindowSearchOutline18,
  capture_tweet: IconChatBubbleOutline18,
  render_text_cover: IconTextOutline18,
  fetch_blobs: IconDownloadOutline18,
  archive_page: IconArchiveOutline18,
  fetch_video_ytdlp: IconVideoOutline18,
  ensure_poster: IconImageOutline18,
  fetch_avatar: IconUserOutline18,
  finalize: IconSparkleOutline18,
} satisfies Record<Op, IconComponent>;

export function isDownloadWaiting(row: DownloadRow): boolean {
  return (
    row.status === "pending" ||
    row.status === "blocked" ||
    row.status === "retrying"
  );
}

export function isDownloadAttention(row: DownloadRow): boolean {
  return (
    row.status === "failed" ||
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

export function downloadStatusLabel(row: DownloadRow, paused: boolean): string {
  if (row.status === "running") return row.stage ?? "Downloading";
  if (isDownloadStopped(row, paused)) return "Paused";
  if (row.status === "complete") return "Saved to your library";
  if (row.status === "failed") return "Couldn't download";
  if (row.status === "retrying") return "Trying again";
  if (row.status === "blocked") return "Waiting to retry";
  if (row.status === "cancelled") return "Cancelled";
  return "Waiting";
}

export function downloadStatusIcon(
  row: DownloadRow,
  paused: boolean,
): IconComponent {
  if (isDownloadAttention(row)) {
    return IconTriangleWarningOutline18;
  }
  if (row.status === "complete") return IconCheckOutline18;
  if (row.status === "cancelled") return IconXmarkOutline18;
  if (isDownloadStopped(row, paused)) return IconMediaPauseOutline18;
  if (row.status === "pending") return IconClockOutline18;
  if (row.op) return STAGE_ICONS[row.op];
  return IconDownloadOutline18;
}
