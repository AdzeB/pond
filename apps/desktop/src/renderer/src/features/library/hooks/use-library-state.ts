import { useLocation, useParams } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { useBootReady, useSaves } from "@/core/data/hooks";
import { primarySelectionStore } from "@/core/data/selection";
import type { Save } from "@/core/data/types";
import { listBaseFromPath } from "@/core/lib/search-schemas";
import { useStableStrings } from "@/core/lib/use-stable-array";
import { parseMode, type SaveListMode } from "@/features/library/lib/save-list";
import { useViewStore } from "@/features/library/stores/view-store";
import type { ViewMode } from "@/features/library/types";
import { useNarrowedSaves } from "./use-narrowed-saves";

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
  };
  const location = useLocation();
  const view = useViewStore();

  const parentBase = listBaseFromPath(location.pathname);
  const recognized = parseMode(parentBase);
  const mode: SaveListMode = recognized ?? "library";
  const unknown = recognized === null;

  const sourceFilter = mode === "source" ? (params.source ?? "") : "";

  // The open save is now pure client state (drives the side drawer); cards
  // read it through `useIsPrimary`.
  const selectedId = useStore(primarySelectionStore, (s) => s.id);

  const viewMode = view.layout as ViewMode;

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
