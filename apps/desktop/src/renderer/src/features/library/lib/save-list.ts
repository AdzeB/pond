import { pickPrimaryUnit } from "@/core/data/media";
import type { Save } from "@/core/data/types";

export type SaveListMode =
  | "library"
  | "source"
  | "untagged"
  | "recents"
  | "trash";

// Returns `null` for unrecognized URLs so callers can decide whether
// to redirect (the library view does) or silently fall back to
// `"library"` (the detail page does). Keeps the route table free of
// per-mode listings while still letting the UI catch typos and stale
// deep links.
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
      return "All Saves";
  }
}

interface ModeFilterOptions {
  mode: SaveListMode;
  sourceFilter: string;
  recentsOrder: ReadonlyMap<string, number> | null;
}

// Shared between the grid and the detail-page navigator so j/k can't
// step onto a save the grid hides. Ingesting / failed saves live
// behind the ProcessingButton dialog, not in the list. Complete saves
// with nothing to render (no extracted media and no tweet screenshot)
// would only ever paint the empty placeholder, so they're hidden too —
// except in trash, where they stay visible so they can be cleaned up.
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
      if (!pickPrimaryUnit(save)) return false;
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
