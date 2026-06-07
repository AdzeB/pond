import type { FieldId, Predicate, Query } from "@pond/schema/filters/types";
import { useMemo } from "react";
import {
  type DisplayPrefKey,
  type DisplayPrefs,
  setDisplayPref,
  useDisplayPrefs,
} from "@/lib/stores/display-prefs";
import {
  addPredicate,
  resetFilters,
  restoreDefaults,
  setFieldPredicate,
  setLayout,
  setQuery,
  setSort,
  setZoom,
  updatePredicate,
  useViewStore,
} from "@/lib/stores/view-store";
import type { LayoutValue } from "@/lib/utils/view-prefs";
import type { SortDir, SortKey } from "@/pool/use-filtered-saves";

export type { SortDir, SortKey };

export interface ViewState {
  query: Query;
  pendingPredicates: Predicate[];
  layout: LayoutValue;
  sort: { key: SortKey; dir: SortDir };
  displayPrefs: DisplayPrefs;
  zoom: number;
}

export interface ViewActions {
  setQuery: (next: Query) => void;
  addPredicate: () => void;
  updatePredicate: (idx: number, next: Predicate | null) => void;
  setFieldPredicate: (field: FieldId, next: Predicate | null) => void;
  resetFilters: () => void;
  setLayout: (next: LayoutValue) => void;
  setSort: (next: { key: SortKey; dir: SortDir }) => void;
  setDisplayPref: (key: DisplayPrefKey, value: boolean) => void;
  setZoom: (next: number) => void;
  restoreDefaults: () => void;
}

export interface ViewContextValue {
  state: ViewState;
  actions: ViewActions;
}

const actions: ViewActions = {
  setQuery,
  addPredicate,
  updatePredicate,
  setFieldPredicate,
  resetFilters,
  setLayout,
  setSort,
  setDisplayPref,
  setZoom,
  restoreDefaults,
};

export function useView(): ViewContextValue {
  const view = useViewStore();
  const displayPrefs = useDisplayPrefs();
  return useMemo(
    () => ({
      state: {
        query: view.query,
        pendingPredicates: view.pendingPredicates,
        layout: view.layout,
        sort: { key: view.sortKey as SortKey, dir: view.sortDir },
        displayPrefs,
        zoom: view.zoom,
      },
      actions,
    }),
    [view, displayPrefs],
  );
}
