import type { SaveFile } from "@/features/saves/types";
import { type FileViewerKind, viewerCapabilityFor } from "./viewer-capability";

export type StoredFileViewerKind = Exclude<FileViewerKind, "media">;

export function storedFileViewerKind(
  file: SaveFile | null,
): StoredFileViewerKind | null {
  if (!file) return null;
  const kind = viewerCapabilityFor(file).kind;
  return kind === "media" ? null : kind;
}
