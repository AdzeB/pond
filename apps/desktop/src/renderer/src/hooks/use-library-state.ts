import { useLocation, useParams } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useMemo } from "react";
import { parseMode, type SaveListMode } from "@/lib/save/list";
import type { Save, ViewMode } from "@/lib/types";
import { listPathForLocation } from "@/lib/ui/list-path";
import { primarySelectionStore } from "@/stores/selection";
import { useFilterQuery, useLayout, useSearchText } from "@/stores/view-store";
import { useNarrowedSaves } from "./use-narrowed-saves";
import { useBootReady, useSaves } from "./use-saves";
import { useStableStrings } from "./use-stable-array";

interface LibraryState {
  bootReady: boolean;
  totalSaves: number;
  filtered: ReadonlyArray<Save>;
  filteredIds: ReadonlyArray<string>;
  mode: SaveListMode;
  sourceFilter: string;
  hasActiveSearch: boolean;
  hasActiveFilter: boolean;
  searchText: string;
  selectedId: string | null;
  viewMode: ViewMode;
  /** True when the URL's mode segment wasn't recognized, so callers can navigate away. */
  unknown: boolean;
}

export function useLibraryState(): LibraryState {
  const saves = useSaves();
  const bootReady = useBootReady();
  const params = useParams({ strict: false }) as {
    source?: string;
  };
  const location = useLocation();
  const layout = useLayout();
  const searchText = useSearchText();
  const filterQuery = useFilterQuery();

  const parentBase = listPathForLocation(location.pathname);
  const recognized = parseMode(parentBase);
  const mode: SaveListMode = recognized ?? "library";
  const unknown = recognized === null;

  const sourceFilter = mode === "source" ? (params.source ?? "") : "";
  const hasActiveSearch = searchText.trim().length > 0;
  const hasActiveFilter = filterQuery.rules.length > 0;

  /** The open save is pure client state; cards read it via `useIsPrimary`. */
  const selectedId = useSelector(primarySelectionStore, (s) => s.id);

  const viewMode = layout as ViewMode;

  const filtered = useNarrowedSaves(mode, sourceFilter);
  const filteredIdsFresh = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const filteredIds = useStableStrings(filteredIdsFresh);

  return {
    bootReady,
    totalSaves: saves.length,
    filtered,
    filteredIds,
    mode,
    sourceFilter,
    hasActiveSearch,
    hasActiveFilter,
    searchText,
    selectedId,
    viewMode,
    unknown,
  };
}
