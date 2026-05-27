import { readQuery } from "@pond/schema/filters/url";
import { useLocation, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import type { ViewMode } from "@/components/library/layout-switcher";
import { useRecents } from "@/lib/recents";
import {
  applyModeFilter,
  applyModeSort,
  parseMode,
  type SaveListMode,
} from "@/lib/save-list";
import {
  type LibrarySearch,
  listBaseFromPath,
  searchToParams,
} from "@/lib/search-schemas";
import { useStableById, useStableStrings } from "@/lib/use-stable-array";
import { readViewPref } from "@/lib/view-prefs";
import { useBootReady, useSaves } from "@/pool/hooks";
import { useSearchResults } from "@/pool/search";
import { primarySelection } from "@/pool/selection";
import type { Save } from "@/pool/types";
import { useFilteredSaves } from "@/pool/use-filtered-saves";

export type SavesMode = SaveListMode;

interface LibraryState {
  bootReady: boolean;
  totalSaves: number;
  filtered: ReadonlyArray<Save>;
  filteredIds: ReadonlyArray<string>;
  mode: SaveListMode;
  sourceFilter: string;
  selectedId: string | null;
  viewMode: ViewMode;
  // True when the URL's mode segment wasn't recognized. Callers can
  // <Navigate /> away rather than silently rendering the library.
  unknown: boolean;
}

export function useLibraryState(): LibraryState {
  const saves = useSaves();
  const bootReady = useBootReady();
  const params = useParams({ strict: false }) as {
    source?: string;
    id?: string;
  };
  const location = useLocation();
  const search = useSearch({ strict: false }) as LibrarySearch;
  const params0 = useMemo(() => searchToParams(search), [search]);
  const query = useMemo(() => readQuery(params0), [params0]);
  const q = search.q ?? "";

  const parentBase = listBaseFromPath(location.pathname);
  const recognized = parseMode(parentBase);
  const mode: SaveListMode = recognized ?? "library";
  const unknown = recognized === null;

  const sourceFilter = mode === "source" ? (params.source ?? "") : "";
  const selectedId = params.id ?? null;

  // Mirror the URL `selectedId` into the primary-selection store so
  // `useIsPrimary(id)` consumers (each `SaveCard`) re-render only
  // when their own primary state changes.
  useEffect(() => {
    primarySelection.set(selectedId);
  }, [selectedId]);

  const recents = useRecents();
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
  const viewMode = (search.view ??
    readViewPref("view") ??
    "waterfall") as ViewMode;

  const searchHits = useSearchResults(q);

  const narrowedFresh = useMemo(() => {
    const base = mode === "trash" ? saves : (searchHits.results ?? saves);
    const filteredList = applyModeFilter(base, {
      mode,
      sourceFilter,
      recentsOrder,
    });
    return applyModeSort(filteredList, { mode, recentsOrder, randomSeed });
  }, [saves, searchHits.results, sourceFilter, mode, recentsOrder, randomSeed]);

  const narrowed = useStableById(narrowedFresh);

  const sortOpts = useMemo(() => {
    if (mode === "recents" || mode === "random" || mode === "trash") {
      return undefined;
    }
    const rawSort = search.sort ?? readViewPref("sort") ?? "savedAt";
    const sortKey: "savedAt" | "title" | "fileSize" =
      rawSort === "title" || rawSort === "fileSize" ? rawSort : "savedAt";
    const rawDir = search.dir ?? readViewPref("dir");
    const sortDir: "asc" | "desc" = rawDir === "asc" ? "asc" : "desc";
    return { sortKey, sortDir };
  }, [mode, search.sort, search.dir]);

  const filteredFresh = useFilteredSaves(narrowed, query, sortOpts);
  const filtered = useStableById(filteredFresh);
  const filteredIdsFresh = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const filteredIds = useStableStrings(filteredIdsFresh);

  return {
    bootReady,
    totalSaves: saves.length,
    filtered,
    filteredIds,
    mode,
    sourceFilter,
    selectedId,
    viewMode,
    unknown,
  };
}
