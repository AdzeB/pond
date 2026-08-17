import { useEffect, useMemo, useRef } from "react";
import {
  applyModeFilter,
  applyModeSort,
  type SaveListMode,
} from "@/lib/save/list";
import type { Save } from "@/lib/types";
import { useAskResult } from "@/stores/ask-store";
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
import { useSemanticRank } from "./use-semantic-rank";
import { useStableById } from "./use-stable-array";

/** Shared narrowing pipeline (search hits -> mode filter/sort -> view query/sort) so the two views can't diverge. */
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
  const ask = useAskResult();

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
  /** Reorders by semantic similarity only while a find-anything query is active; otherwise a no-op so the chosen sort is preserved. */
  const ranked = useSemanticRank(filteredFresh);
  const normal = useStableById(ranked);

  /** Keep the last settled grid while FTS is in flight so typing never flashes "no matches". */
  const settledRef = useRef(normal);
  if (!searchHits.searching) settledRef.current = normal;
  const visible =
    searchHits.searching && settledRef.current.length > 0
      ? settledRef.current
      : normal;

  /** The agent result is a frozen, ranked answer that overrides the normal view and ignores manual filters/sort by design. */
  const askFresh = useMemo(() => {
    if (!ask.active) return EMPTY;
    const byId = new Map(saves.map((s) => [s.id, s]));
    const out: Save[] = [];
    for (const id of ask.ids) {
      const save = byId.get(id);
      if (save) out.push(save);
    }
    return out;
  }, [ask.active, ask.ids, saves]);
  const askSaves = useStableById(askFresh);

  /** Hold the last resolved view through the `thinking` phase so switching never flashes an empty grid; `done` (even zero hits) and `error` resolve immediately. */
  const lastResolvedRef = useRef<ReadonlyArray<Save>>(EMPTY);
  useEffect(() => {
    if (!ask.active) {
      lastResolvedRef.current = EMPTY;
    } else if (ask.status !== "thinking") {
      lastResolvedRef.current = askSaves;
    }
  }, [ask.active, ask.status, askSaves]);

  if (!ask.active) return visible;
  if (ask.status === "thinking") {
    /** Keep the previous answer, else the current view, so the grid is never empty before the first result. */
    return lastResolvedRef.current.length > 0
      ? lastResolvedRef.current
      : visible;
  }
  return askSaves;
}

const EMPTY: ReadonlyArray<Save> = [];
