import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";

export interface TagGroupRow {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  collapsed: boolean;
  tagIds: string[];
  tagNames: string[];
}

interface TagGroupsState {
  readonly rows: ReadonlyArray<TagGroupRow>;
  readonly loaded: boolean;
}

export const tagGroupsStore = new Store<TagGroupsState>({
  rows: [],
  loaded: false,
});

let inflight: Promise<ReadonlyArray<TagGroupRow>> | null = null;
let subscribed = false;

function sortGroups(rows: ReadonlyArray<TagGroupRow>): TagGroupRow[] {
  return rows
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function setRows(rows: ReadonlyArray<TagGroupRow>): void {
  tagGroupsStore.setState(() => ({ rows: sortGroups(rows), loaded: true }));
}

async function load(): Promise<ReadonlyArray<TagGroupRow>> {
  if (tagGroupsStore.state.loaded) return tagGroupsStore.state.rows;
  if (inflight) return inflight;
  inflight = (async () => {
    const rows = (await window.pond.query("tagGroups.list", {})) as Array<
      Partial<TagGroupRow> & { id?: string; name?: string }
    >;
    const normalised = rows
      .map(normaliseRow)
      .filter((r): r is TagGroupRow => r !== null);
    setRows(normalised);
    inflight = null;
    return tagGroupsStore.state.rows;
  })();
  return inflight;
}

function normaliseRow(
  raw: Partial<TagGroupRow> & { id?: string; name?: string },
): TagGroupRow | null {
  if (!raw.id || typeof raw.name !== "string") return null;
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color ?? null,
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
    collapsed: Boolean(raw.collapsed),
    tagIds: Array.isArray(raw.tagIds) ? raw.tagIds : [],
    tagNames: Array.isArray(raw.tagNames) ? raw.tagNames : [],
  };
}

// tag_group_member rows always trigger a refetch; they don't have
// stable IDs in the sync log (we encode tagId:groupId) and the
// membership lists in cache need both names + sort order resolved
// from a join, which the in-memory store can't reconstruct on its
// own.
let refetchScheduled = false;
function scheduleRefetch(): void {
  if (refetchScheduled) return;
  refetchScheduled = true;
  queueMicrotask(() => {
    refetchScheduled = false;
    void (async () => {
      tagGroupsStore.setState(() => ({ rows: [], loaded: false }));
      inflight = null;
      await load();
    })();
  });
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
    if (event.modelName === "tag_group_member") {
      scheduleRefetch();
      return;
    }
    if (event.modelName !== "tag_group") return;
    if (!tagGroupsStore.state.loaded) return;

    const cache = tagGroupsStore.state.rows;

    if (event.action === "I") {
      const row = normaliseRow(event.data as Partial<TagGroupRow>);
      if (!row) return;
      const idx = cache.findIndex((r) => r.id === row.id);
      const next = cache.slice();
      if (idx >= 0)
        next[idx] = {
          ...row,
          tagIds: cache[idx]?.tagIds ?? [],
          tagNames: cache[idx]?.tagNames ?? [],
        };
      else next.push(row);
      setRows(next);
      return;
    }
    if (event.action === "U") {
      const patch = (event.data ?? {}) as Partial<TagGroupRow>;
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
      const next = cache.filter((r) => r.id !== event.modelId);
      setRows(next);
      return;
    }
  });
}

export function useTagGroups(): ReadonlyArray<TagGroupRow> {
  useEffect(() => {
    ensureSubscribed();
    void load();
  }, []);
  return useStore(tagGroupsStore, (s) => s.rows);
}

export function getTagGroupsSnapshot(): ReadonlyArray<TagGroupRow> {
  return tagGroupsStore.state.rows;
}

export async function reloadTagGroups(): Promise<ReadonlyArray<TagGroupRow>> {
  tagGroupsStore.setState(() => ({ rows: [], loaded: false }));
  inflight = null;
  return load();
}
