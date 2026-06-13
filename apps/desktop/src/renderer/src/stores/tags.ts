import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import { byName } from "@/lib/sort";

export interface TagRow {
  id: string;
  name: string;
  lastUsedAt: number | null;
  usageCount: number;
  createdAt: number | null;
}

interface TagsState {
  readonly rows: ReadonlyArray<TagRow>;
  readonly loaded: boolean;
}

const tagsStore = new Store<TagsState>({ rows: [], loaded: false });

let inflight: Promise<ReadonlyArray<TagRow>> | null = null;
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
    lastUsedAt: toMs(raw.lastUsedAt as unknown),
    usageCount: typeof raw.usageCount === "number" ? raw.usageCount : 0,
    createdAt: toMs(raw.createdAt as unknown),
  };
}

function setRows(rows: ReadonlyArray<TagRow>): void {
  tagsStore.setState(() => ({ rows, loaded: true }));
}

async function load(): Promise<ReadonlyArray<TagRow>> {
  if (tagsStore.state.loaded) return tagsStore.state.rows;
  if (inflight) return inflight;
  inflight = (async () => {
    const rows = (await window.pond.query("tags.list", {})) as Array<
      Partial<TagRow> & { id?: string }
    >;
    const normalised = rows
      .map(normaliseRow)
      .filter((r): r is TagRow => r !== null)
      .sort(byName);
    setRows(normalised);
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
    if (!tagsStore.state.loaded) return;

    const cache = tagsStore.state.rows;

    if (event.action === "I") {
      const row = normaliseRow(event.data as Partial<TagRow>);
      if (!row) return;
      const idx = cache.findIndex((r) => r.id === row.id);
      const next = cache.slice();
      if (idx >= 0) next[idx] = row;
      else next.push(row);
      next.sort(byName);
      setRows(next);
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
      next.sort(byName);
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

export function useTags(): ReadonlyArray<TagRow> {
  useEffect(() => {
    ensureSubscribed();
    void load();
  }, []);
  return useStore(tagsStore, (s) => s.rows);
}
