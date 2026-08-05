import { pickPrimaryUnit } from "@/lib/media/units";
import type { Save } from "@/lib/types";

export type SaveListMode =
  | "library"
  | "source"
  | "untagged"
  | "recents"
  | "trash";

/** Returns `null` for unrecognized URLs so callers choose to redirect or fall back to "library". */
export function parseMode(parentBase: string): SaveListMode | null {
  if (parentBase === "/" || parentBase === "") return "library";
  if (parentBase.startsWith("/source/")) return "source";
  if (parentBase === "/untagged") return "untagged";
  if (parentBase === "/recents") return "recents";
  if (parentBase === "/trash") return "trash";
  return null;
}

export function extractSource(parentBase: string): string {
  const match = /^\/source\/([^/]+)/.exec(parentBase);
  return match?.[1]?.toLowerCase() ?? "";
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s[0]?.toUpperCase() + s.slice(1);
}

export function labelForMode(mode: SaveListMode, sourceFilter: string): string {
  switch (mode) {
    case "source":
      return sourceFilter ? capitalise(sourceFilter) : "Source";
    case "untagged":
      return "Untagged";
    case "recents":
      return "Recents";
    case "trash":
      return "Trash";
    default:
      return "Library";
  }
}

interface ModeFilterOptions {
  mode: SaveListMode;
  sourceFilter: string;
  recentsOrder: ReadonlyMap<string, number> | null;
}

/** True when the card can show image/video media or a website/link/text save. */
function isRenderable(save: Save): boolean {
  if (pickPrimaryUnit(save)) return true;
  if (save.mediaType === "link" || save.mediaType === "text") return true;
  if (save.url && !save.url.startsWith("pond:")) return true;
  return false;
}

/** Shared by grid and detail navigator so j/k can't land on a hidden save; trash keeps unrenderable saves visible for cleanup. */
export function applyModeFilter(
  saves: readonly Save[],
  { mode, sourceFilter, recentsOrder }: ModeFilterOptions,
): Save[] {
  return saves.filter((save) => {
    if (mode === "trash") {
      if (!save.deletedAt) return false;
    } else {
      if (save.deletedAt) return false;
      if (save.status !== "complete") return false;
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
