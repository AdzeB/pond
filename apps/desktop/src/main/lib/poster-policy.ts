import type { SaveFile, Source } from "@pond/schema/db";
import { isVideoFile } from "@shared/media-index";

export type PosterWrite = {
  kind: "poster";
  filename: string;
  bytes: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
};

export function hasMediaDims(
  dims: Pick<SaveFile, "width" | "height"> | null | undefined,
): boolean {
  return (
    dims != null &&
    dims.width != null &&
    dims.height != null &&
    Number.isFinite(dims.width) &&
    Number.isFinite(dims.height) &&
    dims.width > 0 &&
    dims.height > 0
  );
}

/** YouTube resting posters use the platform thumbnail. */
export function usesPlatformPoster(source: Source | null | undefined): boolean {
  return source === "youtube";
}

export function videoPosterSlots(files: readonly SaveFile[]): {
  videos: SaveFile[];
  posters: SaveFile[];
} {
  const videos = files.filter(isVideoFile);
  const posters = files.filter((f) => f.kind === "poster");
  return { videos, posters };
}

export function posterRepairIndexes(files: readonly SaveFile[]): number[] {
  const { videos, posters } = videoPosterSlots(files);
  const indexes: number[] = [];
  for (let index = 0; index < videos.length; index += 1) {
    if (!videos[index]) continue;
    if (!posters[index]) indexes.push(index);
  }
  return indexes;
}

export function needsPosterRepair(files: readonly SaveFile[]): boolean {
  return posterRepairIndexes(files).length > 0;
}

export function posterFilename(index: number, ext: string): string {
  return index === 0 ? `poster${ext}` : `poster-${index}${ext}`;
}

export function videoFilename(index: number, ext: string): string {
  return index === 0 ? `video${ext}` : `video-${index}${ext}`;
}

/** Prefer yt-dlp info thumb, then capture media posterUrl. */
export function youtubeThumbnailUrl(rawJson: unknown): string | null {
  if (!rawJson || typeof rawJson !== "object") return null;
  const root = rawJson as {
    ytdlp?: { thumbnail?: unknown };
    capture?: {
      media?: Array<{ type?: string; posterUrl?: unknown; url?: unknown }>;
    };
  };
  const fromInfo = root.ytdlp?.thumbnail;
  if (typeof fromInfo === "string" && fromInfo.length > 0) return fromInfo;

  const media = root.capture?.media;
  if (!Array.isArray(media)) return null;
  for (const entry of media) {
    if (typeof entry.posterUrl === "string" && entry.posterUrl.length > 0) {
      return entry.posterUrl;
    }
  }
  for (const entry of media) {
    if (
      entry.type !== "video" &&
      typeof entry.url === "string" &&
      /ytimg\.com|i\.ytimg\.com|ggpht\.com/i.test(entry.url)
    ) {
      return entry.url;
    }
  }
  return null;
}
