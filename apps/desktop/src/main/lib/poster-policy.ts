import type { SaveFile, Source } from "@pond/schema/db";
import type { RawJson } from "@pond/schema/raw";
import { isVideoFile } from "@shared/media-index";

export { posterFilename, videoFilename } from "@shared/save-file-names";

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

export function usesPlatformPoster(source: Source | null | undefined): boolean {
  return source === "youtube";
}

export function videoPosterSlots(files: readonly SaveFile[]) {
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

export function youtubeThumbnailUrl(
  rawJson: RawJson | null | undefined,
): string | null {
  if (!rawJson) return null;
  if (rawJson.ytdlp?.thumbnail) return rawJson.ytdlp.thumbnail;

  const media = rawJson.capture?.media ?? [];
  for (const entry of media) {
    if (entry.posterUrl) return entry.posterUrl;
  }
  for (const entry of media) {
    if (
      entry.type !== "video" &&
      /ytimg\.com|i\.ytimg\.com|ggpht\.com/i.test(entry.url)
    ) {
      return entry.url;
    }
  }
  return null;
}
