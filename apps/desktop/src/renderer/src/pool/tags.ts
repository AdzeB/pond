import { useEffect, useState } from "react";

export interface TagRow {
  id: string;
  name: string;
  description: string | null;
  starred: boolean;
  lastUsedAt: number | null;
  usageCount: number;
  createdAt: number | null;
}

let cache: TagRow[] | null = null;
let inflight: Promise<TagRow[]> | null = null;
const listeners = new Set<(rows: TagRow[]) => void>();
let subscribed = false;

function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === "string") {
    const asNum = Number(v);
    if (!Number.isNaN(asNum) && v.trim() !== "" && Number.isFinite(asNum)) {
      return asNum;
    }
    const parsed = Date.parse(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normaliseRow(raw: Partial<TagRow> & { id?: string }): TagRow | null {
  if (!raw.id || typeof raw.name !== "string") return null;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    starred: Boolean(raw.starred),
    lastUsedAt: toMs(raw.lastUsedAt as unknown),
    usageCount: typeof raw.usageCount === "number" ? raw.usageCount : 0,
    createdAt: toMs(raw.createdAt as unknown),
  };
}

function emit(next: TagRow[]): void {
  cache = next;
  for (const fn of listeners) fn(next);
}

async function load(): Promise<TagRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const rows = (await window.pond.query("tags.list", {})) as Array<
      Partial<TagRow> & { id?: string }
    >;
    const normalised = rows
      .map(normaliseRow)
      .filter((r): r is TagRow => r !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
    cache = normalised;
    inflight = null;
    return normalised;
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
    if (event.modelName !== "tag") return;
    if (!cache) return;

    if (event.action === "I") {
      const row = normaliseRow(event.data as Partial<TagRow>);
      if (!row) return;
      const idx = cache.findIndex((r) => r.id === row.id);
      const next = cache.slice();
      if (idx >= 0) next[idx] = row;
      else next.push(row);
      next.sort((a, b) => a.name.localeCompare(b.name));
      emit(next);
      return;
    }

    if (event.action === "U") {
      const patch = (event.data ?? {}) as Partial<TagRow>;
      const idx = cache.findIndex((r) => r.id === event.modelId);
      if (idx < 0) return;
      const existing = cache[idx];
      if (!existing) return;
      const merged = normaliseRow({ ...existing, ...patch, id: existing.id });
      if (!merged) return;
      const next = cache.slice();
      next[idx] = merged;
      next.sort((a, b) => a.name.localeCompare(b.name));
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

export function useTags(): TagRow[] {
  const [value, setValue] = useState<TagRow[]>(() => cache ?? []);
  useEffect(() => {
    ensureSubscribed();
    let active = true;
    const update = (next: TagRow[]) => {
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

export function useStarredTags(): TagRow[] {
  const all = useTags();
  return all.filter((t) => t.starred);
}

export function useRecentTags(limit = 12): TagRow[] {
  const all = useTags();
  return all
    .filter((t) => t.lastUsedAt != null)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, limit);
}

export function getTagsSnapshot(): TagRow[] {
  return cache ?? [];
}

export async function reloadTags(): Promise<TagRow[]> {
  cache = null;
  inflight = null;
  const next = await load();
  emit(next);
  return next;
}
