import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import { bySortOrderThenName } from "@/lib/sort";

export interface SavedViewRow {
  id: string;
  name: string;
  question: string | null;
  query: Query;
  sortKey: string;
  sortDir: "asc" | "desc";
  layout: string | null;
  sortOrder: number;
}

interface SavedViewsState {
  readonly rows: ReadonlyArray<SavedViewRow>;
  readonly loaded: boolean;
}

const savedViewsStore = new Store<SavedViewsState>({
  rows: [],
  loaded: false,
});

let inflight: Promise<ReadonlyArray<SavedViewRow>> | null = null;
let subscribed = false;

function sortViews(rows: ReadonlyArray<SavedViewRow>): SavedViewRow[] {
  return rows.slice().sort(bySortOrderThenName);
}

function setRows(rows: ReadonlyArray<SavedViewRow>): void {
  savedViewsStore.setState(() => ({ rows: sortViews(rows), loaded: true }));
}

// Guard a persisted query value, falling back to the empty query.
function coerceQuery(raw: unknown): Query {
  if (!raw || typeof raw !== "object") return EMPTY_QUERY;
  return raw as Query;
}

function normaliseRow(raw: unknown): SavedViewRow | null {
  const r = raw as Partial<SavedViewRow> & { id?: string; name?: string };
  if (!r.id || typeof r.name !== "string") return null;
  return {
    id: r.id,
    name: r.name,
    question: typeof r.question === "string" ? r.question : null,
    query: coerceQuery(r.query),
    sortKey: typeof r.sortKey === "string" ? r.sortKey : "savedAt",
    sortDir: r.sortDir === "asc" ? "asc" : "desc",
    layout: typeof r.layout === "string" ? r.layout : null,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : 0,
  };
}

async function load(): Promise<ReadonlyArray<SavedViewRow>> {
  if (savedViewsStore.state.loaded) return savedViewsStore.state.rows;
  if (inflight) return inflight;
  inflight = (async () => {
    const rows = (await window.pond.query("savedViews.list", {})) as unknown[];
    setRows(
      rows.map(normaliseRow).filter((r): r is SavedViewRow => r !== null),
    );
    inflight = null;
    return savedViewsStore.state.rows;
  })();
  return inflight;
}

function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;
  window.pond.onSyncAction((raw) => {
    const event = raw as {
      modelName?: string;
      action?: "I" | "U" | "D" | "A";
      modelId?: string;
      data?: unknown;
    };
    if (event.modelName !== "saved_view") return;
    if (!savedViewsStore.state.loaded) return;

    const cache = savedViewsStore.state.rows;

    if (event.action === "I") {
      const row = normaliseRow(event.data);
      if (!row) return;
      const idx = cache.findIndex((r) => r.id === row.id);
      const next = cache.slice();
      if (idx >= 0) next[idx] = row;
      else next.push(row);
      setRows(next);
      return;
    }
    if (event.action === "U") {
      const patch = (event.data ?? {}) as Partial<SavedViewRow>;
      const idx = cache.findIndex((r) => r.id === event.modelId);
      if (idx < 0) return;
      const existing = cache[idx];
      if (!existing) return;
      const next = cache.slice();
      next[idx] = { ...existing, ...patch };
      setRows(next);
      return;
    }
    if (event.action === "D") {
      setRows(cache.filter((r) => r.id !== event.modelId));
      return;
    }
  });
}

export function useSavedViews(): ReadonlyArray<SavedViewRow> {
  useEffect(() => {
    ensureSubscribed();
    void load();
  }, []);
  return useSelector(savedViewsStore, (s) => s.rows);
}

export interface CreateSavedViewInput {
  name: string;
  question?: string | null;
  query?: Query;
  sortKey?: string;
  sortDir?: string;
  layout?: string | null;
}

export async function createSavedView(
  input: CreateSavedViewInput,
): Promise<string | null> {
  const result = (await window.pond.query("savedViews.create", input)) as {
    ok?: boolean;
    id?: string;
  };
  return result.ok && result.id ? result.id : null;
}

export async function renameSavedView(id: string, name: string): Promise<void> {
  await window.pond.query("savedViews.rename", { id, name });
}

export async function updateSavedView(
  id: string,
  patch: Partial<Omit<SavedViewRow, "id">>,
): Promise<void> {
  await window.pond.query("savedViews.update", { id, patch });
}

export async function deleteSavedView(id: string): Promise<void> {
  await window.pond.query("savedViews.delete", { id });
}
