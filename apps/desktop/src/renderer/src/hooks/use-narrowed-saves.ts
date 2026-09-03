import { useMemo, useRef } from "react";
import {
  applyModeFilter,
  applyModeSort,
  type SaveListMode,
} from "@/lib/save/list";
import { applyNavFilter } from "@/lib/save/nav-filter";
import type { Save } from "@/lib/types";
import { useFolderMemberships, useFolders } from "@/stores/folders";
import { useLibraryNav } from "@/stores/library-chrome";
import { useRecents } from "@/stores/recents";
import {
  useFilterQuery,
  useIncludeSubfolders,
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
import { useRetrievalOverlay } from "./use-retrieval-overlay";
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
  const includeSubfolders = useIncludeSubfolders();
  const nav = useLibraryNav();
  const memberships = useFolderMemberships();
  const folderRows = useFolders();

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
    const filteredList = applyNavFilter(
      applyModeFilter(base, {
        mode,
        sourceFilter,
        recentsOrder,
      }),
      nav,
      memberships,
      folderRows,
      includeSubfolders,
    );
    return applyModeSort(
      filteredList.map((save) => ({
        ...save,
        folderIds: memberships[save.id] ?? [],
      })),
      { mode, recentsOrder },
    );
  }, [
    saves,
    searchHits.results,
    sourceFilter,
    mode,
    recentsOrder,
    nav,
    memberships,
    folderRows,
    includeSubfolders,
  ]);

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
  const filtered = useStableById(filteredFresh);
  const ranked = useRetrievalOverlay(filtered);

  const settledRef = useRef(ranked);
  if (!searchHits.searching) settledRef.current = ranked;
  return searchHits.searching && settledRef.current.length > 0
    ? settledRef.current
    : ranked;
}
