import { FIELD_IDS } from "@pond/schema/filters/meta";
import type { FieldId, Predicate, Query } from "@pond/schema/filters/types";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { SortDir } from "@/core/data/use-filtered-saves";
import { clampZoom, ZOOM_DEFAULT, ZOOM_STORAGE_KEY } from "@/core/lib/zoom";
import {
  isLayoutValue,
  type LayoutValue,
  nextLayout,
  readViewPref,
  writeViewPref,
} from "@/features/library/lib/view-prefs";
import {
  defaultPredicateFor,
  predicateIsActive,
} from "@/features/library/menus/view/filter/helpers";

export type Combinator = "and" | "or";

// Committed query derived from draft rows: only active predicates filter; inactive rows stay mid-edit.
function deriveQuery(rows: Predicate[], combinator: Combinator): Query {
  return { combinator, rules: rows.filter(predicateIsActive) };
}

// Library view state. In a store, not the URL (desktop app). Layout/sort/zoom persist via `view-prefs`; q/query/capture are session-only.

function applyZoomVar(zoom: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--grid-min", `${zoom}px`);
}

export interface ViewStoreState {
  q: string;
  // Ordered draft conditions (incomplete rows allowed); `query` is the committed view.
  rows: Predicate[];
  combinator: Combinator;
  query: Query;
  layout: LayoutValue;
  // Broad string: list view sorts by columns the grid filter doesn't model; grid consumers narrow first.
  sortKey: string;
  sortDir: SortDir;
  zoom: number;
  capture: boolean;
  // Applied saved view; tabs compare live query/sort against it to show a "modified" state.
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
  return useStore(store, (s) => s);
}

export function useFilterQuery(): Query {
  return useStore(store, (s) => s.query);
}

export function useLayout(): LayoutValue {
  return useStore(store, (s) => s.layout);
}

export function useSearchText(): string {
  return useStore(store, (s) => s.q);
}

export function useSortKey(): string {
  return useStore(store, (s) => s.sortKey);
}

export function useSortDir(): SortDir {
  return useStore(store, (s) => s.sortDir);
}

export function useActiveViewId(): string | null {
  return useStore(store, (s) => s.activeViewId);
}

export function setSearchText(q: string): void {
  store.setState((s) => (s.q === q ? s : { ...s, q }));
}

export function setQuery(query: Query): void {
  store.setState((s) => {
    const rows = query.rules.filter((c): c is Predicate => !("rules" in c));
    const combinator: Combinator = query.combinator === "or" ? "or" : "and";
    return { ...s, rows, combinator, query: deriveQuery(rows, combinator) };
  });
}

export function resetFilters(): void {
  store.setState((s) => ({ ...s, rows: [], query: EMPTY_QUERY }));
}

// Apply a saved view: load its query + sort (+ layout) and mark it active.
export function applySavedView(view: {
  id: string;
  query: Query;
  sortKey: string;
  sortDir: SortDir;
  layout?: string | null;
}): void {
  const layout =
    view.layout && isLayoutValue(view.layout) ? view.layout : undefined;
  if (layout) writeViewPref("view", layout);
  writeViewPref("sort", view.sortKey);
  writeViewPref("dir", view.sortDir);
  const rows = view.query.rules.filter((c): c is Predicate => !("rules" in c));
  const combinator: Combinator = view.query.combinator === "or" ? "or" : "and";
  store.setState((s) => ({
    ...s,
    rows,
    combinator,
    query: deriveQuery(rows, combinator),
    sortKey: view.sortKey,
    sortDir: view.sortDir,
    layout: layout ?? s.layout,
    activeViewId: view.id,
  }));
}

export function clearActiveView(): void {
  store.setState((s) =>
    s.activeViewId === null ? s : { ...s, activeViewId: null },
  );
}

// Append a fresh draft condition, defaulting to the first field; duplicates allowed, so never no-ops.
export function addCondition(field?: FieldId): void {
  const next = field ?? FIELD_IDS[0];
  if (!next) return;
  store.setState((s) => {
    const rows = [...s.rows, defaultPredicateFor(next)];
    return { ...s, rows, query: deriveQuery(rows, s.combinator) };
  });
}

// Replace (or remove, when `next` is null) the row at `idx`.
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

export function setZoom(zoom: number): void {
  const clamped = clampZoom(zoom);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(clamped));
    } catch {
      /* storage denied: keep the in-memory value in sync anyway */
    }
  }
  applyZoomVar(clamped);
  store.setState((s) => ({ ...s, zoom: clamped }));
}

export function restoreDefaults(): void {
  writeViewPref("view", "waterfall");
  writeViewPref("sort", "savedAt");
  writeViewPref("dir", "desc");
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(ZOOM_DEFAULT));
    } catch {
      /* storage denied */
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

function openCapture(): void {
  store.setState((s) => (s.capture ? s : { ...s, capture: true }));
}

// Translate an inbound URL search payload into store state; filters aren't URL-serialized (use setQuery).
export function applyViewStateFromParams(params: URLSearchParams): void {
  if (params.get("capture") === "1") openCapture();
  const q = params.get("q");
  if (q) setSearchText(q);
}
