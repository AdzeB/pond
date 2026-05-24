import { useEffect, useState } from "react";

export interface TagGroupRow {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  collapsed: boolean;
  tagIds: string[];
  tagNames: string[];
}

let cache: TagGroupRow[] | null = null;
let inflight: Promise<TagGroupRow[]> | null = null;
const listeners = new Set<(rows: TagGroupRow[]) => void>();
let subscribed = false;

function sortGroups(rows: TagGroupRow[]): TagGroupRow[] {
  return rows
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function emit(next: TagGroupRow[]): void {
  cache = sortGroups(next);
  for (const fn of listeners) fn(cache);
}

async function load(): Promise<TagGroupRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const rows = (await window.pond.query("tagGroups.list", {})) as Array<
      Partial<TagGroupRow> & { id?: string; name?: string }
    >;
    const normalised = rows
      .map(normaliseRow)
      .filter((r): r is TagGroupRow => r !== null);
    cache = sortGroups(normalised);
    inflight = null;
    return cache;
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

// tag_group_member rows always trigger a refetch; they don't have stable
// IDs in the sync log (we encode tagId:groupId) and the membership lists
// in cache need both names + sort order resolved from a join, which the
// in-memory store can't reconstruct on its own.
let refetchScheduled = false;
function scheduleRefetch(): void {
  if (refetchScheduled) return;
  refetchScheduled = true;
  queueMicrotask(() => {
    refetchScheduled = false;
    void (async () => {
      cache = null;
      inflight = null;
      const next = await load();
      for (const fn of listeners) fn(next);
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
    if (!cache) return;

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
      emit(next);
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
      emit(next);
      return;
    }
    if (event.action === "D") {
      const next = cache.filter((r) => r.id !== event.modelId);
      emit(next);
      return;
    }
  });
}

export function useTagGroups(): TagGroupRow[] {
  const [value, setValue] = useState<TagGroupRow[]>(() => cache ?? []);
  useEffect(() => {
    ensureSubscribed();
    let active = true;
    const update = (next: TagGroupRow[]) => {
      if (!active) return;
      setValue(next);
    };
    listeners.add(update);
    void load().then(update);
    return () => {
      active = false;
      listeners.delete(update);
    };
  }, []);
  return value;
}

export function getTagGroupsSnapshot(): TagGroupRow[] {
  return cache ?? [];
}

export async function reloadTagGroups(): Promise<TagGroupRow[]> {
  cache = null;
  inflight = null;
  const next = await load();
  for (const fn of listeners) fn(next);
  return next;
}
