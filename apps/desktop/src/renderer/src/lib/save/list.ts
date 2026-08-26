import { pickPrimaryUnit } from "@/lib/media/units";
import type { Save } from "@/lib/types";

export type SaveListMode =
  | "library"
  | "source"
  | "untagged"
  | "recents"
  | "trash";

export function parseMode(parentBase: string): SaveListMode | null {
  if (parentBase === "/" || parentBase === "") return "library";
  if (parentBase.startsWith("/source/")) return "source";
  if (parentBase === "/untagged") return "untagged";
  if (parentBase === "/recents") return "recents";
  if (parentBase === "/trash") return "trash";
  return null;
}

interface ModeFilterOptions {
  mode: SaveListMode;
  sourceFilter: string;
  recentsOrder: ReadonlyMap<string, number> | null;
}

function isRenderable(save: Save): boolean {
  if (pickPrimaryUnit(save)) return true;
  if (save.mediaType === "link" || save.mediaType === "text") return true;
  if (save.url && !save.url.startsWith("pond:")) return true;
  return false;
}

export function applyModeFilter(
  saves: readonly Save[],
  { mode, sourceFilter, recentsOrder }: ModeFilterOptions,
): Save[] {
  return saves.filter((save) => {
    if (mode === "trash") {
      if (!save.deletedAt) return false;
    } else {
      if (save.deletedAt) return false;
      if (!isVisibleInLibrary(save)) return false;
      if (!isRenderable(save)) return false;
    }
    if (sourceFilter && save.source.toLowerCase() !== sourceFilter) {
      return false;
    }
    if (mode === "untagged" && save.tags.length > 0) return false;
    if (mode === "recents" && !recentsOrder?.has(save.id)) return false;
    return true;
  });
}

function isVisibleInLibrary(save: Save): boolean {
  if (save.status === "complete") return true;
  if (save.status !== "ingesting") return false;
  if ((save.files?.length ?? 0) > 0) return true;
  return save.mediaType === "link" || save.mediaType === "text";
}

interface ModeSortOptions {
  mode: SaveListMode;
  recentsOrder: ReadonlyMap<string, number> | null;
}

export function applyModeSort(
  saves: Save[],
  { mode, recentsOrder }: ModeSortOptions,
): Save[] {
  if (mode === "recents" && recentsOrder) {
    return saves.sort(
      (a, b) =>
        (recentsOrder.get(a.id) ?? Infinity) -
        (recentsOrder.get(b.id) ?? Infinity),
    );
  }
  return saves;
}
