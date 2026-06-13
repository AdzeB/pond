import type { FieldId, Predicate, Query } from "@pond/schema/filters/types";
import { useMemo } from "react";
import type { SortDir, SortKey } from "@/core/data/use-filtered-saves";
import type { LayoutValue } from "@/features/library/lib/view-prefs";
import {
  type DisplayPrefKey,
  type DisplayPrefs,
  setDisplayPref,
  useDisplayPrefs,
} from "@/features/library/stores/display-prefs";
import {
  addCondition,
  type Combinator,
  removeRow,
  reorderRows,
  resetFilters,
  restoreDefaults,
  setCombinator,
  setLayout,
  setQuery,
  setSort,
  setZoom,
  updateRow,
  useViewStore,
} from "@/features/library/stores/view-store";

export type { SortDir, SortKey };

export interface ViewState {
  query: Query;
  rows: Predicate[];
  combinator: Combinator;
  layout: LayoutValue;
  sort: { key: SortKey; dir: SortDir };
  displayPrefs: DisplayPrefs;
  zoom: number;
}

export interface ViewActions {
  setQuery: (next: Query) => void;
  addCondition: (field?: FieldId) => void;
  updateRow: (idx: number, next: Predicate | null) => void;
  removeRow: (idx: number) => void;
  reorderRows: (from: number, to: number) => void;
  setCombinator: (next: Combinator) => void;
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
  addCondition,
  updateRow,
  removeRow,
  reorderRows,
  setCombinator,
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
        rows: view.rows,
        combinator: view.combinator,
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
