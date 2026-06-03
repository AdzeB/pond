import type { FieldId, Predicate, Query } from "@pond/schema/filters/types";
import { EMPTY_QUERY, isEmptyQuery } from "@pond/schema/filters/types";
import { readQuery } from "@pond/schema/filters/url";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { predicateIsActive } from "@/components/library/view-menu/filter/helpers";
import { ZOOM_MAX, ZOOM_MIN } from "@/lib/use-zoom";
import {
  isLayoutValue,
  type LayoutValue,
  nextLayout,
  readViewPref,
  writeViewPref,
} from "@/lib/view-prefs";
import type { SortDir } from "@/pool/use-filtered-saves";

// Single source of truth for the library's view state. Lives in a store
// rather than the URL: this is a desktop app, so shareable URLs buy us
// nothing and the round-trip through search params was the source of a
// duplicate derivation (grid vs controls). Durable bits (layout, sort,
// zoom) persist to localStorage via `view-prefs`; `q`, `query`, and
// `capture` are session-only.

const ZOOM_DEFAULT = 130;
const ZOOM_STORAGE_KEY = "pond.gridZoom";

function clampZoom(n: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
}

function applyZoomVar(zoom: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--grid-min", `${zoom}px`);
}

export interface ViewStoreState {
  q: string;
  query: Query;
  pendingPredicates: Predicate[];
  layout: LayoutValue;
  // Broad string: the list view sorts by columns (tags, dimensions, …)
  // the grid filter doesn't model. Grid consumers narrow before use.
  sortKey: string;
  sortDir: SortDir;
  zoom: number;
  capture: boolean;
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
  query: EMPTY_QUERY,
  pendingPredicates: [],
  layout: readInitialLayout(),
  sortKey: readViewPref("sort") ?? "savedAt",
  sortDir: readViewPref("dir") === "asc" ? "asc" : "desc",
  zoom: readInitialZoom(),
  capture: false,
});

applyZoomVar(store.state.zoom);

export function useViewStore(): ViewStoreState {
  return useStore(store, (s) => s);
}

export function useSearchText(): string {
  return useStore(store, (s) => s.q);
}

export function useFilterQuery(): Query {
  return useStore(store, (s) => s.query);
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

export function setSearchText(q: string): void {
  store.setState((s) => (s.q === q ? s : { ...s, q }));
}

export function setQuery(query: Query): void {
  store.setState((s) => ({ ...s, query }));
}

export function resetFilters(): void {
  store.setState((s) => ({ ...s, pendingPredicates: [], query: EMPTY_QUERY }));
}

export function addPredicate(): void {
  const draft: Predicate = { kind: "p", field: "tags", cmp: "some", value: [] };
  store.setState((s) => ({
    ...s,
    pendingPredicates: [...s.pendingPredicates, draft],
  }));
}

export function setFieldPredicate(
  field: FieldId,
  next: Predicate | null,
): void {
  store.setState((s) => {
    const pendingPredicates = s.pendingPredicates.filter(
      (p) => p.field !== field,
    );
    const clauses = s.query.clauses.filter(
      (c) => c.kind !== "p" || c.field !== field,
    );
    if (next && predicateIsActive(next)) clauses.push(next);
    return { ...s, pendingPredicates, query: { kind: "and", clauses } };
  });
}

export function updatePredicate(idx: number, next: Predicate | null): void {
  store.setState((s) => {
    const committedCount = s.query.clauses.length;

    if (idx < committedCount) {
      const clauses = [...s.query.clauses];
      if (next === null) {
        clauses.splice(idx, 1);
        return { ...s, query: { kind: "and", clauses } };
      }
      if (predicateIsActive(next)) {
        clauses[idx] = next;
        return { ...s, query: { kind: "and", clauses } };
      }
      // Newly-inactive: drop from the query and park as pending so the
      // row stays visible while the user re-picks a value.
      clauses.splice(idx, 1);
      return {
        ...s,
        query: { kind: "and", clauses },
        pendingPredicates: [next, ...s.pendingPredicates],
      };
    }

    const pendingIdx = idx - committedCount;
    if (pendingIdx < 0 || pendingIdx >= s.pendingPredicates.length) return s;

    if (next === null) {
      const out = [...s.pendingPredicates];
      out.splice(pendingIdx, 1);
      return { ...s, pendingPredicates: out };
    }
    if (predicateIsActive(next)) {
      const out = [...s.pendingPredicates];
      out.splice(pendingIdx, 1);
      return {
        ...s,
        pendingPredicates: out,
        query: { kind: "and", clauses: [...s.query.clauses, next] },
      };
    }
    const out = [...s.pendingPredicates];
    out[pendingIdx] = next;
    return { ...s, pendingPredicates: out };
  });
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
    pendingPredicates: [],
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

// Translate an inbound URL search payload (deep links, command palette,
// tag filters) into store state. Keeps external entry points working now
// that the router no longer drives view state.
export function applyViewStateFromParams(params: URLSearchParams): void {
  if (params.get("capture") === "1") openCapture();
  const query = readQuery(params);
  if (!isEmptyQuery(query)) {
    setQuery(query);
    return;
  }
  const q = params.get("q");
  if (q) setSearchText(q);
}
