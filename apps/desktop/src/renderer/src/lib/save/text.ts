import {
  arenaBlockClassFromRawJson,
  TEXT_COVER_KINDS,
  textBodyFromFields,
} from "@shared/text-card";
import { hasArchive, isArchiveFile } from "@/lib/media/archive";
import { composeContentDescription } from "@/lib/save/detail";
import type { Save, SaveFile } from "@/lib/types";

/** Body copy shown for text-only saves (Are.na Text, Cosmos notes, link descriptions). */
export function textBodyForSave(save: Save): string {
  const fromDescription = composeContentDescription(save).trim();
  if (fromDescription) return fromDescription;
  /** Title-only fallback only for saves already typed as text. */
  if (save.mediaType?.toLowerCase() === "text") {
    return textBodyFromFields(null, save.title);
  }
  return "";
}

/** Are.na's block.class, when the harvest stored it on the capture. */
export function arenaBlockClass(save: Save): string | null {
  return arenaBlockClassFromRawJson(save.rawJson);
}

function isMediaFile(file: SaveFile): boolean {
  if (
    file.kind === "video" ||
    file.kind === "poster" ||
    file.kind === "cover" ||
    file.kind === "image" ||
    file.kind === "media"
  ) {
    return true;
  }
  if (file.mimeType?.startsWith("video/") === true) return true;
  if (file.mimeType?.startsWith("image/") === true) return true;
  const ext = file.path.split(".").pop()?.toLowerCase() ?? "";
  if (/^(png|jpe?g|gif|webp|avif|heic|heif|svg|bmp|tiff?|ico)$/.test(ext)) {
    return true;
  }
  return /^(mp4|webm|mov|m4v|mkv)$/i.test(ext);
}

export function isTextOnlyAsideFromCover(save: Save): boolean {
  return !(save.files ?? []).some(
    (f) =>
      !TEXT_COVER_KINDS.has(f.kind) &&
      f.kind !== "avatar" &&
      f.kind !== "source_icon" &&
      !isArchiveFile(f) &&
      isMediaFile(f),
  );
}

/** Save with prose and no image/video/archive to show in the media slot. */
export function isTextOnlySave(save: Save): boolean {
  if (save.source === "twitter") return false;
  if (hasArchive(save)) return false;
  if (!textBodyForSave(save)) return false;
  return isTextOnlyAsideFromCover(save);
}
