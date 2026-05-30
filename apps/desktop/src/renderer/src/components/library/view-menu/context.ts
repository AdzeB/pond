import type { FieldId, Predicate, Query } from "@pond/schema/filters/types";
import { createContext, use } from "react";
import type { DisplayPrefKey, DisplayPrefs } from "@/lib/display-prefs";
import type { LayoutValue } from "@/lib/view-prefs";

export type SortKey = "savedAt" | "title" | "fileSize";
export type SortDir = "asc" | "desc";

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
