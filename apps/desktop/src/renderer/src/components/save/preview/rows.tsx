import {
  Calendar,
  Clock,
  Eye,
  HardDrive,
  Maximize2,
  MessageCircle,
  MoveVertical,
  ThumbsUp,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Save } from "@/pool/types";
import {
  formatBytes,
  formatCount,
  formatDuration,
  formatShortDate,
  prettifyType,
} from "./helpers";

export interface PaneRow {
  id: string;
  icon: ReactNode;
  label: string;
  value: string;
}

const ICON_SIZE = 12;

export function collectMetadataRows(save: Save): PaneRow[] {
  const out: PaneRow[] = [];
  const capture = save.rawJson?.capture;
  const ytdlp = save.rawJson?.ytdlp;
  if (!capture) return out;

  const durationSec =
    capture.duration ??
    capture.media.find((m) => m.type === "video")?.durationSec ??
    ytdlp?.duration ??
    null;
  if (durationSec && Number.isFinite(durationSec)) {
    out.push({
      id: "duration",
      icon: <Clock width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Duration",
      value: formatDuration(durationSec),
    });
  }

  const metrics = capture.metrics ?? {};
  const views = metrics.views ?? metrics.plays ?? ytdlp?.view_count ?? null;
  if (views !== null && views !== undefined) {
    out.push({
      id: "views",
      icon: <Eye width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Views",
      value: formatCount(views),
    });
  }

  const likes = metrics.likes ?? ytdlp?.like_count ?? null;
  if (likes !== null && likes !== undefined) {
    out.push({
      id: "likes",
      icon: <ThumbsUp width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Likes",
      value: formatCount(likes),
    });
  }

  const comments =
    metrics.comments ?? metrics.replies ?? ytdlp?.comment_count ?? null;
  if (comments !== null && comments !== undefined) {
    out.push({
      id: "comments",
      icon: <MessageCircle width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Comments",
      value: formatCount(comments),
    });
  }

  if (capture.publishedAt) {
    out.push({
      id: "published",
      icon: <Calendar width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Published",
      value: formatShortDate(capture.publishedAt),
    });
  }

  return out;
}

export function collectPropertyRows(save: Save): PaneRow[] {
  const out: PaneRow[] = [];

  const type = save.mediaType ?? (save.url ? "Link" : null);
  if (type) {
    out.push({
      id: "type",
      icon: <HardDrive width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Type",
      value: prettifyType(type),
    });
  }

  if (save.savedAt) {
    out.push({
      id: "imported",
      icon: <Calendar width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Imported",
      value: formatShortDate(save.savedAt),
    });
  }

  if (save.createdAt) {
    out.push({
      id: "modified",
      icon: <Calendar width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Modified",
      value: formatShortDate(save.createdAt),
    });
  }

  if (save.fileSize) {
    out.push({
      id: "size",
      icon: <Maximize2 width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Size",
      value: formatBytes(save.fileSize),
    });
  }

  if (save.width && save.height) {
    out.push({
      id: "dimensions",
      icon: <MoveVertical width={ICON_SIZE} height={ICON_SIZE} />,
      label: "Dimensions",
      value: `${save.width} × ${save.height}`,
    });
  }

  return out;
}
