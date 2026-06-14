import { Store } from "@tanstack/store";
import type { Save } from "@/lib/types";

interface SavesState {
  readonly byId: Map<string, Save>;
  readonly sorted: ReadonlyArray<Save>;
}

function savedAtMs(save: Save): number {
  const v = save.savedAt;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function sortByRecency(list: Iterable<Save>): Save[] {
  return Array.from(list).sort((a, b) => savedAtMs(b) - savedAtMs(a));
}

export const savesStore = new Store<SavesState>({
  byId: new Map(),
  sorted: [],
});

// Non-React read facade; mutations go through the helpers below so React consumers wake via `useSelector`.
export const pool = {
  get(id: string): Save | undefined {
    return savesStore.state.byId.get(id);
  },
  ids(): IterableIterator<string> {
    return savesStore.state.byId.keys();
  },
  snapshot(): ReadonlyArray<Save> {
    return savesStore.state.sorted;
  },
  upsert(save: Save): void {
    upsertSave(save);
  },
  bulkUpsert(list: ReadonlyArray<Save>): void {
    bulkUpsertSaves(list);
  },
  delete(id: string): void {
    deleteSave(id);
  },
  clear(): void {
    clearSaves();
  },
};

export function upsertSave(save: Save): void {
  savesStore.setState((s) => {
    const prev = s.byId.get(save.id);
    if (prev === save) return s;
    const byId = new Map(s.byId);
    byId.set(save.id, save);
    const sorted =
      prev && savedAtMs(prev) === savedAtMs(save)
        ? s.sorted.map((row) => (row.id === save.id ? save : row))
        : sortByRecency(byId.values());
    return { byId, sorted };
  });
}

export function bulkUpsertSaves(list: ReadonlyArray<Save>): void {
  if (list.length === 0) return;
  savesStore.setState((s) => {
    const byId = new Map(s.byId);
    for (const save of list) byId.set(save.id, save);
    return { byId, sorted: sortByRecency(byId.values()) };
  });
}

export function deleteSave(id: string): void {
  savesStore.setState((s) => {
    if (!s.byId.has(id)) return s;
    const byId = new Map(s.byId);
    byId.delete(id);
    return { byId, sorted: s.sorted.filter((row) => row.id !== id) };
  });
}

function clearSaves(): void {
  savesStore.setState((s) =>
    s.byId.size === 0 ? s : { byId: new Map(), sorted: [] },
  );
}

// Merge a lazily-fetched full `rawJson` into a pooled save; keeps `sorted` identity stable so only useSave(id) consumers wake.
export function patchSaveRawJson(id: string, rawJson: Save["rawJson"]): void {
  savesStore.setState((s) => {
    const prev = s.byId.get(id);
    if (!prev) return s;
    const byId = new Map(s.byId);
    byId.set(id, { ...prev, rawJson });
    return { byId, sorted: s.sorted };
  });
}
