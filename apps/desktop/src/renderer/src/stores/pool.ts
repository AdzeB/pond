import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import {
  clearTextIndex,
  indexSave,
  indexSaves,
  removeSaveFromIndex,
} from "@/lib/search/text-index";
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
  // Keep the BM25 text index current. Enrichment optimistic updates also funnel
  // through here, so captions/OCR/transcripts get indexed as they land.
  indexSave(save);
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
  indexSaves(list);
  savesStore.setState((s) => {
    const byId = new Map(s.byId);
    for (const save of list) byId.set(save.id, save);
    return { byId, sorted: sortByRecency(byId.values()) };
  });
}

export function deleteSave(id: string): void {
  removeSaveFromIndex(id);
  savesStore.setState((s) => {
    if (!s.byId.has(id)) return s;
    const byId = new Map(s.byId);
    byId.delete(id);
    return { byId, sorted: s.sorted.filter((row) => row.id !== id) };
  });
}

function clearSaves(): void {
  clearTextIndex();
  savesStore.setState((s) =>
    s.byId.size === 0 ? s : { byId: new Map(), sorted: [] },
  );
}

// Live count of non-trashed saves stuck in `failed` ingest; drives the sync
// page's "Retry failed" affordance.
export function useFailedSaveCount(): number {
  return useSelector(savesStore, (s) => {
    let n = 0;
    for (const save of s.byId.values()) {
      if (save.status === "failed" && !save.deletedAt) n += 1;
    }
    return n;
  });
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

// Hydrate the lazily-loaded transcript (omitted from the list payload).
export function patchSaveTranscript(
  id: string,
  transcript: Save["transcript"],
): void {
  savesStore.setState((s) => {
    const prev = s.byId.get(id);
    if (!prev) return s;
    const byId = new Map(s.byId);
    const next = { ...prev, transcript };
    byId.set(id, next);
    // Transcript is a searchable field and arrives lazily (omitted from the list
    // payload), so fold it into the text index when it hydrates.
    indexSave(next);
    return { byId, sorted: s.sorted };
  });
}
