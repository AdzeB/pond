import { readQuery } from "@pond/schema/filters/url";
import { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { ViewMode } from "@/components/library/layout-switcher";
import { useRecents } from "@/lib/recents";
import {
  applyModeFilter,
  applyModeSort,
  type SaveListMode,
} from "@/lib/save-list";
import { useStableById, useStableStrings } from "@/lib/use-stable-array";
import { readViewPref } from "@/lib/view-prefs";
import { useBootReady, useSaves } from "@/pool/hooks";
import { useSearchResults } from "@/pool/search";
import { primarySelection } from "@/pool/selection";
import type { Save } from "@/pool/types";
import { useFilteredSaves } from "@/pool/use-filtered-saves";

export type SavesMode = SaveListMode;

interface SavesData {
  bootReady: boolean;
  totalSaves: number;
  filtered: Save[];
  filteredIds: string[];
  sourceFilter: string;
  selectedId: string | null;
  viewMode: ViewMode;
}

export function useSavesData(mode: SavesMode): SavesData {
  const saves = useSaves();
  const bootReady = useBootReady();
  const params = useParams<{ source?: string; id?: string }>();
  const [searchParams] = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);
  const q = searchParams.get("q") ?? "";

  const sourceFilter = mode === "source" ? (params.source ?? "") : "";
  const selectedId = params.id ?? null;

  // Mirror the URL `selectedId` into the primary-selection store so
  // `useIsPrimary(id)` consumers (each `SaveCard`) re-render only
  // when their own primary state changes. Without this, every card
  // would re-render on primary change because `selectedId` was being
  // passed down as a prop.
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
  const viewMode = (searchParams.get("view") ??
    readViewPref("view") ??
    "waterfall") as ViewMode;

  const search = useSearchResults(q);

  const narrowedFresh = useMemo(() => {
    // Trash mode ignores the text-search pool (which excludes deleted)
    // and works directly off the full saves list.
    const base = mode === "trash" ? saves : (search.results ?? saves);
    const filteredList = applyModeFilter(base, {
      mode,
      sourceFilter,
      recentsOrder,
    });
    return applyModeSort(filteredList, { mode, recentsOrder, randomSeed });
  }, [saves, search.results, sourceFilter, mode, recentsOrder, randomSeed]);

  const narrowed = useStableById(narrowedFresh);

  const sortOpts = useMemo(() => {
    if (mode === "recents" || mode === "random" || mode === "trash") {
      return undefined;
    }
    const rawSort =
      searchParams.get("sort") ?? readViewPref("sort") ?? "savedAt";
    const sortKey: "savedAt" | "title" | "fileSize" =
      rawSort === "title" || rawSort === "fileSize" ? rawSort : "savedAt";
    const rawDir = searchParams.get("dir") ?? readViewPref("dir");
    const sortDir: "asc" | "desc" = rawDir === "asc" ? "asc" : "desc";
    return { sortKey, sortDir };
  }, [mode, searchParams]);

  const filteredFresh = useFilteredSaves(narrowed, query, sortOpts);
  const filtered = useStableById(filteredFresh);
  const filteredIdsFresh = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const filteredIds = useStableStrings(filteredIdsFresh);

  return {
    bootReady,
    totalSaves: saves.length,
    filtered,
    filteredIds,
    sourceFilter,
    selectedId,
    viewMode,
  };
}
