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
import {
  useFilterQuery,
  useSearchText,
  useSortDir,
  useSortKey,
} from "@/features/library/stores/view-store";

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
  const query = useFilterQuery();
  const q = useSearchText();
  const viewSortKey = useSortKey();
  const viewSortDir = useSortDir();

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

  const narrowedFresh = useMemo(() => {
    const base = searchHits.results ?? saves;
    const filteredList = applyModeFilter(base, {
      mode,
      sourceFilter,
      recentsOrder,
    });
    return applyModeSort(filteredList, { mode, recentsOrder });
  }, [saves, searchHits.results, sourceFilter, mode, recentsOrder]);

  const narrowed = useStableById(narrowedFresh);

  const sortOpts = useMemo(() => {
    if (mode === "recents") {
      return undefined;
    }
    const sortKey: SortKey =
      viewSortKey === "title" || viewSortKey === "fileSize"
        ? viewSortKey
        : "savedAt";
    const sortDir: SortDir = viewSortDir === "asc" ? "asc" : "desc";
    return { sortKey, sortDir };
  }, [mode, viewSortKey, viewSortDir]);

  const filteredFresh = useFilteredSaves(narrowed, query, sortOpts);
  return useStableById(filteredFresh);
}
