import { hasArchive } from "@/lib/media/archive";
import { buildMediaUnits } from "@/lib/media/units";
import { composeContentDescription } from "@/lib/save/detail";
import type { Save } from "@/lib/types";

/** Body copy shown for text-only saves (Are.na Text, Cosmos notes, link descriptions). */
export function textBodyForSave(save: Save): string {
  return composeContentDescription(save).trim();
}

/** Are.na's block.class, when the harvest stored it on the capture. */
export function arenaBlockClass(save: Save): string | null {
  const raw = save.rawJson as
    | { capture?: { extras?: { blockClass?: unknown } } }
    | null
    | undefined;
  const cls = raw?.capture?.extras?.blockClass;
  return typeof cls === "string" ? cls.toLowerCase() : null;
}

/** Save with prose and no image/video/archive to show in the media slot. */
export function isTextOnlySave(save: Save): boolean {
  if (hasArchive(save)) return false;
  if (!textBodyForSave(save)) return false;
  return buildMediaUnits(save).length === 0;
}
