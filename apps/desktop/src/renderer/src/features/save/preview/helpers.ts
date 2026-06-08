import type { Save } from "@/core/data/types";
import type { ChapterCue } from "@/features/media/video-player/chapters-vtt";

export function getYouTubeChapters(save: Save): ChapterCue[] | undefined {
  const ytdlp = save.rawJson?.ytdlp?.chapters;
  if (!ytdlp || ytdlp.length === 0) return undefined;
  const out: ChapterCue[] = [];
  for (const c of ytdlp) {
    const title = (c.title ?? "").trim();
    if (!title) continue;
    if (typeof c.start_time !== "number") continue;
    out.push({
      title,
      startSec: c.start_time,
      endSec: typeof c.end_time === "number" ? c.end_time : undefined,
    });
  }
  return out.length > 0 ? out : undefined;
}

export function descriptionMatchesTitle(save: Save): boolean {
  if (!save.title || !save.description) return false;
  const norm = (s: string) =>
    s
      .replace(/[…\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const t = norm(save.title);
  const d = norm(save.description);
  if (!t || !d) return false;
  if (t === d) return true;
  if (d.startsWith(t)) return true;
  return false;
}

export function prettifyType(t: string): string {
  const lower = t.toLowerCase();
  if (lower === "video") return "MP4";
  if (lower === "image") return "Image";
  if (lower === "link") return "Link";
  return t.toUpperCase();
}

export function pickAuthorColor(name: string): string {
  const palette = [
    "#d6409f",
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#a855f7",
    "#ef4444",
    "#14b8a6",
    "#0ea5e9",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length] ?? "#3b82f6";
}

export function humaniseRefreshReason(
  reason:
    | "not_found"
    | "no_url"
    | "no_metadata"
    | "auth_required"
    | "blocked"
    | "internal_error",
): string {
  switch (reason) {
    case "not_found":
      return "This save no longer exists in the library.";
    case "no_url":
      return "This save has no source URL to refresh from.";
    case "blocked":
      return "Couldn't reach the source. The host may be offline or blocking us.";
    case "no_metadata":
      return "The source page didn't expose anything new.";
    case "auth_required":
      return "Connect this source to scrape pages that need a sign-in.";
    case "internal_error":
      return "Pond hit an unexpected error. Check the logs.";
  }
}
