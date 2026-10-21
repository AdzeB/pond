import { isVideoFile } from "@shared/media-index";
import { deriveTypeKind } from "@/features/saves/lib/media/units";
import type { Save } from "@/features/saves/types";

export function hasVideoFile(save: Save): boolean {
  return save.files.some(isVideoFile);
}

export function needsVideoDownload(save: Save): boolean {
  return (
    save.source !== "local" &&
    deriveTypeKind(null, save) === "video" &&
    !hasVideoFile(save)
  );
}
