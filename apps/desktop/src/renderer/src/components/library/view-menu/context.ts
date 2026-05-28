import type { Predicate, Query } from "@pond/schema/filters/types";
import { createContext, use } from "react";
import type { Density } from "@/lib/density";
import type { DisplayPrefKey, DisplayPrefs } from "@/lib/display-prefs";
import type { LayoutValue } from "@/lib/view-prefs";

export type SortKey = "savedAt" | "title" | "fileSize";
export type SortDir = "asc" | "desc";

export interface ViewState {
  query: Query;
  // Predicates the user added but haven't yet given a meaningful value to.
  // They live here (not in the URL) because the URL encoder strips clauses
  // whose value would round-trip as nothing. Pending rows transition into
  // `query.clauses` as soon as their value is "active".
  pendingPredicates: Predicate[];
  layout: LayoutValue;
  sort: { key: SortKey; dir: SortDir };
  density: Density;
  displayPrefs: DisplayPrefs;
  zoom: number;
}

export interface ViewActions {
  setQuery: (next: Query) => void;
  addPredicate: () => void;
  updatePredicate: (idx: number, next: Predicate | null) => void;
  reorderPredicate: (from: number, to: number) => void;
  resetFilters: () => void;
  setLayout: (next: LayoutValue) => void;
  setSort: (next: { key: SortKey; dir: SortDir }) => void;
  setDensity: (next: Density) => void;
  setDisplayPref: (key: DisplayPrefKey, value: boolean) => void;
  setZoom: (next: number) => void;
  restoreDefaults: () => void;
}

export interface ViewMeta {
  triggerRef?: React.Ref<HTMLButtonElement>;
}

export interface ViewContextValue {
  state: ViewState;
  actions: ViewActions;
  meta: ViewMeta;
}

export const ViewContext = createContext<ViewContextValue | null>(null);

export function useView(): ViewContextValue {
  const ctx = use(ViewContext);
  if (!ctx) {
    throw new Error("View sub-component used outside View.Root");
  }
  return ctx;
}
