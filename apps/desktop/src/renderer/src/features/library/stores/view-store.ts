import type { FieldId, Predicate, Query } from "@pond/schema/filters/types";
import { EMPTY_QUERY, isPredicate } from "@pond/schema/filters/types";
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
import { predicateIsActive } from "@/features/library/menus/view/filter/helpers";

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
  query: Query;
  pendingPredicates: Predicate[];
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
  query: EMPTY_QUERY,
  pendingPredicates: [],
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
  store.setState((s) => ({ ...s, query }));
}

export function resetFilters(): void {
  store.setState((s) => ({ ...s, pendingPredicates: [], query: EMPTY_QUERY }));
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
  store.setState((s) => ({
    ...s,
    query: view.query,
    pendingPredicates: [],
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

// Add a draft filter for a field. No-op if that field already has a filter
// (active or pending) — the bar keeps one predicate per field. The draft
// starts inactive and lives in `pendingPredicates` so its chip stays visible
// while the user picks a value.
export function addPredicate(draft: Predicate): void {
  store.setState((s) => {
    const exists =
      s.query.rules.some((c) => isPredicate(c) && c.field === draft.field) ||
      s.pendingPredicates.some((p) => p.field === draft.field);
    if (exists) return s;
    return { ...s, pendingPredicates: [...s.pendingPredicates, draft] };
  });
}

export function setFieldPredicate(
  field: FieldId,
  next: Predicate | null,
): void {
  store.setState((s) => {
    const pendingPredicates = s.pendingPredicates.filter(
      (p) => p.field !== field,
    );
    const rules = s.query.rules.filter(
      (c) => !isPredicate(c) || c.field !== field,
    );
    if (next) {
      // Active predicates commit to the query; inactive ones (e.g. an empty
      // value mid-edit) park as pending so the chip doesn't disappear.
      if (predicateIsActive(next)) rules.push(next);
      else pendingPredicates.push(next);
    }
    return { ...s, pendingPredicates, query: { combinator: "and", rules } };
  });
}

export function updatePredicate(idx: number, next: Predicate | null): void {
  store.setState((s) => {
    const committedCount = s.query.rules.length;

    if (idx < committedCount) {
      const rules = [...s.query.rules];
      if (next === null) {
        rules.splice(idx, 1);
        return { ...s, query: { combinator: "and", rules } };
      }
      if (predicateIsActive(next)) {
        rules[idx] = next;
        return { ...s, query: { combinator: "and", rules } };
      }
      // Newly-inactive: drop from the query and park as pending so the
      // row stays visible while the user re-picks a value.
      rules.splice(idx, 1);
      return {
        ...s,
        query: { combinator: "and", rules },
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
        query: { combinator: "and", rules: [...s.query.rules, next] },
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

// Translate an inbound URL search payload (deep links, command palette) into
// store state. Filters are no longer serialized through the URL — callers that
// want to apply a filter call `setQuery` directly.
export function applyViewStateFromParams(params: URLSearchParams): void {
  if (params.get("capture") === "1") openCapture();
  const q = params.get("q");
  if (q) setSearchText(q);
}
