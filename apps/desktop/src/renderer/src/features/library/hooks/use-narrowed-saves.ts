import { useMemo } from "react";
import { useSaves } from "@/core/data/hooks";
import { useSearchResults } from "@/core/data/search";
import type { Save } from "@/core/data/types";
import {
  type SortDir,
  type SortKey,
  useFilteredSaves,
} from "@/core/data/use-filtered-saves";
import { useStableById } from "@/core/lib/use-stable-array";
import {
  applyModeFilter,
  applyModeSort,
  type SaveListMode,
} from "@/features/library/lib/save-list";
import { useRecents } from "@/features/library/stores/recents";
import { useViewStore } from "@/features/library/stores/view-store";

/**
 * Shared library narrowing pipeline: full-text search hits -> route-mode
 * filter/sort -> declarative view query/sort. Both `useLibraryState` and
 * `useSaveList` build on this so the two views can never diverge.
 */
export function useNarrowedSaves(
  mode: SaveListMode,
  sourceFilter: string,
): ReadonlyArray<Save> {
  const saves = useSaves();
  const recents = useRecents();
  const view = useViewStore();
  const query = view.query;
  const q = view.q;

  const searchHits = useSearchResults(q, { deletedOnly: mode === "trash" });

  const recentsOrder = useMemo(() => {
    if (mode !== "recents") return null;
    const map = new Map<string, number>();
    for (let i = 0; i < recents.length; i++) {
      const entry = recents[i];
      if (entry) map.set(entry.saveId, i);
    }
    return map;
  }, [mode, recents]);

  const randomSeed = useMemo(() => Math.random().toString(36).slice(2), []);

  const narrowedFresh = useMemo(() => {
    const base = searchHits.results ?? saves;
    const filteredList = applyModeFilter(base, {
      mode,
      sourceFilter,
      recentsOrder,
    });
    return applyModeSort(filteredList, { mode, recentsOrder, randomSeed });
  }, [saves, searchHits.results, sourceFilter, mode, recentsOrder, randomSeed]);

  const narrowed = useStableById(narrowedFresh);

  const sortOpts = useMemo(() => {
    if (mode === "recents" || mode === "random") {
      return undefined;
    }
    const sortKey: SortKey =
      view.sortKey === "title" || view.sortKey === "fileSize"
        ? view.sortKey
        : "savedAt";
    const sortDir: SortDir = view.sortDir === "asc" ? "asc" : "desc";
    return { sortKey, sortDir };
  }, [mode, view.sortKey, view.sortDir]);

  const filteredFresh = useFilteredSaves(narrowed, query, sortOpts);
  return useStableById(filteredFresh);
}
