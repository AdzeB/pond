import { useMemo, useRef } from "react";
import {
  applyModeFilter,
  applyModeSort,
  type SaveListMode,
} from "@/lib/save/list";
import type { Save } from "@/lib/types";
import { useRecents } from "@/stores/recents";
import {
  useFilterQuery,
  useSearchText,
  useSortDir,
  useSortKey,
} from "@/stores/view-store";
import {
  isSortKey,
  type SortDir,
  type SortKey,
  useFilteredSaves,
} from "./use-filtered-saves";
import { useSaves } from "./use-saves";
import { useSearchResults } from "./use-search-results";
import { useStableById } from "./use-stable-array";

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
    const sortKey: SortKey = isSortKey(viewSortKey) ? viewSortKey : "savedAt";
    const sortDir: SortDir = viewSortDir === "asc" ? "asc" : "desc";
    return { sortKey, sortDir };
  }, [mode, viewSortKey, viewSortDir]);

  const filteredFresh = useFilteredSaves(narrowed, query, sortOpts);
  const normal = useStableById(filteredFresh);

  const settledRef = useRef(normal);
  if (!searchHits.searching) settledRef.current = normal;
  return searchHits.searching && settledRef.current.length > 0
    ? settledRef.current
    : normal;
}
