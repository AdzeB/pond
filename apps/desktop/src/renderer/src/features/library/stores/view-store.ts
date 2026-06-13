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

// The committed query is derived from the editable draft rows: only active
// predicates (those with a usable value) participate in filtering and get
// persisted into saved views. Inactive rows stay in the panel mid-edit.
function deriveQuery(rows: Predicate[], combinator: Combinator): Query {
  return { combinator, rules: rows.filter(predicateIsActive) };
}

// Single source of truth for the library's view state. Lives in a store
// rather than the URL: this is a desktop app, so shareable URLs buy us
// nothing and the round-trip through search params was the source of a
// duplicate derivation (grid vs controls). Durable bits (layout, sort,
// zoom) persist to localStorage via `view-prefs`; `q`, `query`, and
// `capture` are session-only.

function applyZoomVar(zoom: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--grid-min", `${zoom}px`);
}

export interface ViewStoreState {
  q: string;
  // Ordered draft conditions, including incomplete rows still being edited.
  // Allows duplicate fields. `query` below is the derived, committed view.
  rows: Predicate[];
  combinator: Combinator;
  query: Query;
  layout: LayoutValue;
  // Broad string: the list view sorts by columns (tags, dimensions, …)
  // the grid filter doesn't model. Grid consumers narrow before use.
  sortKey: string;
  sortDir: SortDir;
  zoom: number;
  capture: boolean;
  // The saved view currently applied, if any. Tabs compare the live query/
  // sort against the view's stored values to surface a "modified" state.
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

export function useSearchText(): string {
  return useStore(store, (s) => s.q);
}

export function useSortKey(): string {
  return useStore(store, (s) => s.sortKey);
}

export function useSortDir(): SortDir {
  return useStore(store, (s) => s.sortDir);
}

export function useCapture(): boolean {
  return useStore(store, (s) => s.capture);
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

// Append a fresh draft condition. Defaults to the first available field; the
// user changes the field/operator/value from the panel. Duplicate fields are
// allowed, so this never no-ops.
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

export function openCapture(): void {
  store.setState((s) => (s.capture ? s : { ...s, capture: true }));
}

export function closeCapture(): void {
  store.setState((s) => (s.capture ? { ...s, capture: false } : s));
}

// Translate an inbound URL search payload (deep links, command palette) into
// store state. Filters are no longer serialized through the URL — callers that
// want to apply a filter call `setQuery` directly.
export function applyViewStateFromParams(params: URLSearchParams): void {
  if (params.get("capture") === "1") openCapture();
  const q = params.get("q");
  if (q) setSearchText(q);
}
