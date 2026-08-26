import { Store } from "@tanstack/store";

interface ClipEntry {
  vec: Float32Array;
  model: string;
}

interface ClipState {
  readonly byId: Map<string, ClipEntry>;
  readonly version: number;
  readonly loaded: boolean;
}

const store = new Store<ClipState>({
  byId: new Map(),
  version: 0,
  loaded: false,
});

export const clipEmbeddingStore = store;

interface WireClipEmbedding {
  id: string;
  clipEmbedding: number[] | null;
  clipModel: string | null;
}

let loadInflight: Promise<void> | null = null;

export function loadClipEmbeddings(): Promise<void> {
  if (store.state.loaded) return Promise.resolve();
  if (loadInflight) return loadInflight;
  loadInflight = (async () => {
    try {
      const rows = (await window.pond.query(
        "saves.clipEmbeddings",
        {},
      )) as WireClipEmbedding[];
      const byId = new Map<string, ClipEntry>();
      for (const row of rows) {
        if (!row.clipEmbedding || !row.clipModel) continue;
        byId.set(row.id, {
          vec: Float32Array.from(row.clipEmbedding),
          model: row.clipModel,
        });
      }
      store.setState((s) => ({ byId, version: s.version + 1, loaded: true }));
    } catch (err) {
      console.warn("[clip] failed to load persisted vectors", err);
      store.setState((s) => ({ ...s, loaded: true }));
    } finally {
      loadInflight = null;
    }
  })();
  return loadInflight;
}

export function setClipEmbedding(
  id: string,
  vec: Float32Array,
  model: string,
): void {
  store.setState((s) => {
    const byId = new Map(s.byId);
    byId.set(id, { vec, model });
    return { byId, version: s.version + 1, loaded: s.loaded };
  });
  void window.pond
    .query("saves.patchDerived", {
      id,
      patch: { clipEmbedding: Array.from(vec), clipModel: model },
    })
    .catch((err) => {
      console.warn(`[clip] failed to persist vector for ${id}`, err);
    });
}

export function clearClipEmbeddings(ids?: readonly string[]): number {
  if (ids && ids.length > 0) {
    let count = 0;
    store.setState((s) => {
      const byId = new Map(s.byId);
      for (const id of ids) if (byId.delete(id)) count++;
      return count === 0
        ? s
        : { byId, version: s.version + 1, loaded: s.loaded };
    });
    return count;
  }
  const count = store.state.byId.size;
  if (count === 0) return 0;
  store.setState((s) => ({
    byId: new Map(),
    version: s.version + 1,
    loaded: s.loaded,
  }));
  return count;
}
