import type { Save } from "@/pool/types";

export type SaveListMode =
  | "library"
  | "source"
  | "untagged"
  | "recents"
  | "random"
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
  if (parentBase === "/random") return "random";
  if (parentBase === "/trash") return "trash";
  return null;
}

export function extractSource(parentBase: string): string {
  const match = /^\/source\/([^/]+)/.exec(parentBase);
  return match?.[1]?.toLowerCase() ?? "";
}

export function capitalise(s: string): string {
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
    case "random":
      return "Random";
    case "trash":
      return "Trash";
    default:
      return "All Saves";
  }
}

export function hashShuffleKey(id: string, seed: string): number {
  const s = `${id}:${seed}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

interface ModeFilterOptions {
  mode: SaveListMode;
  sourceFilter: string;
  recentsOrder: ReadonlyMap<string, number> | null;
}

// Shared between the grid and the detail-page navigator so j/k can't
// step onto a save the grid hides. Ingesting / failed saves live
// behind the ProcessingButton dialog, not in the list.
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
  randomSeed: string;
}

export function applyModeSort(
  saves: Save[],
  { mode, recentsOrder, randomSeed }: ModeSortOptions,
): Save[] {
  if (mode === "recents" && recentsOrder) {
    return saves.sort(
      (a, b) =>
        (recentsOrder.get(a.id) ?? Infinity) -
        (recentsOrder.get(b.id) ?? Infinity),
    );
  }
  if (mode === "random") {
    return saves.sort(
      (a, b) =>
        hashShuffleKey(a.id, randomSeed) - hashShuffleKey(b.id, randomSeed),
    );
  }
  return saves;
}
