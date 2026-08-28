import { formatListKinds } from "@pond/schema/list-kinds";
import type { Save } from "@/lib/types";
import {
  formatBytes,
  formatCount,
  formatDuration,
  formatTimestampLine,
} from "@/lib/util/format";
import { prettifyType } from "./helpers";

interface PaneRow {
  id: string;
  label: string;
  value: string;
}

export function collectInfoRows(save: Save): PaneRow[] {
  const out: PaneRow[] = [];

  const type =
    save.source === "web"
      ? "web"
      : (save.mediaType ?? (save.url ? "Link" : null));
  if (type) {
    out.push({
      id: "type",
      label: "Type",
      value: prettifyType(type),
    });
  }

  const list = formatListKinds(save.listKinds);
  if (list) {
    out.push({
      id: "list",
      label: "List",
      value: list,
    });
  }

  const capture = save.rawJson?.capture;
  const ytdlp = save.rawJson?.ytdlp;

  const durationSec =
    capture?.duration ??
    capture?.media.find((m) => m.type === "video")?.durationSec ??
    ytdlp?.duration ??
    null;
  if (durationSec && Number.isFinite(durationSec)) {
    out.push({
      id: "duration",
      label: "Duration",
      value: formatDuration(durationSec),
    });
  }

  const metrics = capture?.metrics ?? {};
  const views = metrics.views ?? metrics.plays ?? ytdlp?.view_count ?? null;
  if (views !== null && views !== undefined) {
    out.push({
      id: "views",
      label: "Views",
      value: formatCount(views),
    });
  }

  const likes = metrics.likes ?? ytdlp?.like_count ?? null;
  if (likes !== null && likes !== undefined) {
    out.push({
      id: "likes",
      label: "Likes",
      value: formatCount(likes),
    });
  }

  const comments =
    metrics.comments ?? metrics.replies ?? ytdlp?.comment_count ?? null;
  if (comments !== null && comments !== undefined) {
    out.push({
      id: "comments",
      label: "Comments",
      value: formatCount(comments),
    });
  }

  if (metrics.retweets !== null && metrics.retweets !== undefined) {
    out.push({
      id: "retweets",
      label: "Reposts",
      value: formatCount(metrics.retweets),
    });
  }

  if (metrics.quotes !== null && metrics.quotes !== undefined) {
    out.push({
      id: "quotes",
      label: "Quotes",
      value: formatCount(metrics.quotes),
    });
  }

  const bookmarks = metrics.bookmarks ?? metrics.saves ?? null;
  if (bookmarks !== null && bookmarks !== undefined) {
    out.push({
      id: "bookmarks",
      label: "Bookmarks",
      value: formatCount(bookmarks),
    });
  }

  if (metrics.shares !== null && metrics.shares !== undefined) {
    out.push({
      id: "shares",
      label: "Shares",
      value: formatCount(metrics.shares),
    });
  }

  if (save.width && save.height) {
    out.push({
      id: "dimensions",
      label: "Dimensions",
      value: `${save.width} × ${save.height}`,
    });
  }

  if (save.fileSize) {
    out.push({
      id: "size",
      label: "Size",
      value: formatBytes(save.fileSize),
    });
  }

  if (capture?.publishedAt) {
    out.push({
      id: "published",
      label: "Published",
      value: formatTimestampLine(capture.publishedAt),
    });
  }

  if (save.savedAt) {
    out.push({
      id: "imported",
      label: "Imported",
      value: formatTimestampLine(save.savedAt),
    });
  }

  if (save.createdAt) {
    out.push({
      id: "modified",
      label: "Modified",
      value: formatTimestampLine(save.createdAt),
    });
  }

  return out;
}
