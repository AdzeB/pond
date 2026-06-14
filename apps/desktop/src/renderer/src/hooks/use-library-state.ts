import { useLocation, useParams } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useMemo } from "react";
import type { ViewMode } from "@/lib/library-types";
import { parseMode, type SaveListMode } from "@/lib/save-list";
import { listBaseFromPath } from "@/lib/search-schemas";
import type { Save } from "@/lib/types";
import { primarySelectionStore } from "@/stores/selection";
import { useLayout } from "@/stores/view-store";
import { useNarrowedSaves } from "./use-narrowed-saves";
import { useBootReady, useSaves } from "./use-saves";
import { useStableStrings } from "./use-stable-array";

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
  // True when the URL's mode segment wasn't recognized, so callers can <Navigate /> away.
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

  const parentBase = listBaseFromPath(location.pathname);
  const recognized = parseMode(parentBase);
  const mode: SaveListMode = recognized ?? "library";
  const unknown = recognized === null;

  const sourceFilter = mode === "source" ? (params.source ?? "") : "";

  // The open save is pure client state (drives the drawer); cards read it via `useIsPrimary`.
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
    selectedId,
    viewMode,
    unknown,
  };
}
