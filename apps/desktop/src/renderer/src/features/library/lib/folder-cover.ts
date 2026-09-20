import { pickCardUnit } from "@/features/saves/lib/media/units";
import { thumbUrlFor } from "@/features/saves/lib/media/url";
import type { Save } from "@/features/saves/types";

export function folderCoverUrl(save: Save, width = 36): string | null {
  const unit = pickCardUnit(save);
  if (!unit) return null;
  return thumbUrlFor(unit.url, width);
}
