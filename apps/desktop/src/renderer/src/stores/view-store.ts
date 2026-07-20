import { FIELD_IDS } from "@pond/schema/filters/meta";
import type { FieldId, Predicate, Query } from "@pond/schema/filters/types";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { SortDir } from "@/hooks/use-filtered-saves";
import {
  defaultPredicateFor,
  predicateIsActive,
} from "@/lib/search/filter-helpers";
import {
  isLayoutValue,
  type LayoutValue,
  nextLayout,
  readViewPref,
  writeViewPref,
} from "@/lib/ui/view-prefs";
import { clampZoom, ZOOM_DEFAULT, ZOOM_STORAGE_KEY } from "@/lib/ui/zoom";

export type Combinator = "and" | "or";

/** Only active predicates filter; inactive rows stay mid-edit. */
function deriveQuery(rows: Predicate[], combinator: Combinator): Query {
  return { combinator, rules: rows.filter(predicateIsActive) };
}

/** Library view state, in a store rather than the URL (desktop app); layout/sort/zoom persist via `view-prefs`, q/query/capture are session-only. */

function applyZoomVar(zoom: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--grid-min", `${zoom}px`);
}

interface ViewStoreState {
  q: string;
  /** Verbatim dock Search text, kept separate from `q` (the residual after structured terms parse out) so the field can re-seed when the dock swaps back. */
  searchInput: string;
  /** Ordered draft conditions (incomplete rows allowed); `query` is the committed view. */
  rows: Predicate[];
  combinator: Combinator;
  query: Query;
  layout: LayoutValue;
  /** Broad string: list view sorts by columns the grid filter doesn't model; grid consumers narrow first. */
  sortKey: string;
  sortDir: SortDir;
  zoom: number;
  capture: boolean;
  /** Applied saved view; tabs compare live query/sort against it to show a "modified" state. */
  activeViewId: string | null;
}

function readInitialLayout(): LayoutValue {
  const raw = readViewPref("view");
  return raw && isLayoutValue(raw) ? raw : "waterfall";
}

function readInitialZoom(): number {
  if (typeof window === "undefined") return ZOOM_DEFAULT;
  try {
    const raw = window.localStorage.getItem(ZOOM_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) ? clampZoom(parsed) : ZOOM_DEFAULT;
  } catch {
    return ZOOM_DEFAULT;
  }
}

const store = new Store<ViewStoreState>({
  q: "",
  searchInput: "",
  rows: [],
  combinator: "and",
  query: EMPTY_QUERY,
  layout: readInitialLayout(),
  sortKey: readViewPref("sort") ?? "savedAt",
  sortDir: readViewPref("dir") === "asc" ? "asc" : "desc",
  zoom: readInitialZoom(),
  capture: false,
  activeViewId: null,
});

applyZoomVar(store.state.zoom);

export function useViewStore(): ViewStoreState {
  return useSelector(store, (s) => s);
}

export function useFilterQuery(): Query {
  return useSelector(store, (s) => s.query);
}

export function useLayout(): LayoutValue {
  return useSelector(store, (s) => s.layout);
}

export function useSearchText(): string {
  return useSelector(store, (s) => s.q);
}
export function useSortKey(): string {
  return useSelector(store, (s) => s.sortKey);
}

export function useSortDir(): SortDir {
  return useSelector(store, (s) => s.sortDir);
}
function _setSearchText(q: string): void {
  store.setState((s) => (s.q === q ? s : { ...s, q }));
}
export function setQuery(query: Query): void {
  store.setState((s) => {
    const rows = query.rules.filter((c): c is Predicate => !("rules" in c));
    const combinator: Combinator = query.combinator === "or" ? "or" : "and";
    return { ...s, rows, combinator, query: deriveQuery(rows, combinator) };
  });
}

/** One update: predicates become the active filter (combinator stays "and") and the residual words become `q`. */
export function setSearchInput(predicates: Predicate[], q: string): void {
  store.setState((s) => ({
    ...s,
    q,
    rows: predicates,
    combinator: "and",
    query: deriveQuery(predicates, "and"),
  }));
}
export function resetFilters(): void {
  store.setState((s) => ({
    ...s,
    q: "",
    searchInput: "",
    rows: [],
    query: EMPTY_QUERY,
  }));
}

/** Duplicates are allowed, so this never no-ops. */
export function addCondition(field?: FieldId): void {
  const next = field ?? FIELD_IDS[0];
  if (!next) return;
  store.setState((s) => {
    const rows = [...s.rows, defaultPredicateFor(next)];
    return { ...s, rows, query: deriveQuery(rows, s.combinator) };
  });
}

/** Replaces the row at `idx`, or removes it when `next` is null. */
export function updateRow(idx: number, next: Predicate | null): void {
  store.setState((s) => {
    if (idx < 0 || idx >= s.rows.length) return s;
    const rows = [...s.rows];
    if (next === null) rows.splice(idx, 1);
    else rows[idx] = next;
    return { ...s, rows, query: deriveQuery(rows, s.combinator) };
  });
}

export function removeRow(idx: number): void {
  updateRow(idx, null);
}

export function reorderRows(from: number, to: number): void {
  store.setState((s) => {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= s.rows.length ||
      to >= s.rows.length
    ) {
      return s;
    }
    const rows = [...s.rows];
    const [moved] = rows.splice(from, 1);
    if (!moved) return s;
    rows.splice(to, 0, moved);
    return { ...s, rows, query: deriveQuery(rows, s.combinator) };
  });
}

export function setCombinator(combinator: Combinator): void {
  store.setState((s) =>
    s.combinator === combinator
      ? s
      : { ...s, combinator, query: deriveQuery(s.rows, combinator) },
  );
}

export function setLayout(layout: LayoutValue): void {
  writeViewPref("view", layout);
  store.setState((s) => ({ ...s, layout }));
}

export function cycleLayout(): void {
  setLayout(nextLayout(store.state.layout));
}

export function setSort(next: { key: string; dir: SortDir }): void {
  writeViewPref("sort", next.key);
  writeViewPref("dir", next.dir);
  store.setState((s) => ({ ...s, sortKey: next.key, sortDir: next.dir }));
}

export function adjustZoom(delta: number): void {
  setZoom(store.state.zoom + delta);
}

export function setZoom(zoom: number): void {
  const clamped = clampZoom(zoom);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(clamped));
    } catch {
      /** Storage denied: keep the in-memory value in sync anyway. */
    }
  }
  applyZoomVar(clamped);
  store.setState((s) => ({ ...s, zoom: clamped }));
}

/** Used by the view-options panel to detect a "changed" state per group. */
export const VIEW_DEFAULTS = {
  layout: "waterfall" as LayoutValue,
  sortKey: "savedAt",
  sortDir: "desc" as SortDir,
  zoom: ZOOM_DEFAULT,
};

export function restoreDefaults(): void {
  writeViewPref("view", "waterfall");
  writeViewPref("sort", "savedAt");
  writeViewPref("dir", "desc");
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(ZOOM_DEFAULT));
    } catch {
      /** Storage denied. */
    }
  }
  applyZoomVar(ZOOM_DEFAULT);
  store.setState((s) => ({
    ...s,
    rows: [],
    combinator: "and",
    query: EMPTY_QUERY,
    layout: "waterfall",
    sortKey: "savedAt",
    sortDir: "desc",
    zoom: ZOOM_DEFAULT,
  }));
}

function _openCapture(): void {
  store.setState((s) => (s.capture ? s : { ...s, capture: true }));
}
