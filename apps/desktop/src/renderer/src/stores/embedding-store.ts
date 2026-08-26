import { Store } from "@tanstack/store";

interface EmbeddingEntry {
  vec: Float32Array;
  model: string;
}

interface EmbeddingState {
  readonly byId: Map<string, EmbeddingEntry>;
  readonly loaded: boolean;
}

const store = new Store<EmbeddingState>({
  byId: new Map(),
  loaded: false,
});

export const embeddingStore = store;

interface WireEmbedding {
  id: string;
  embedding: number[] | null;
  embeddingModel: string | null;
}

let loadInflight: Promise<void> | null = null;

export function loadEmbeddings(): Promise<void> {
  if (store.state.loaded) return Promise.resolve();
  if (loadInflight) return loadInflight;
  loadInflight = (async () => {
    try {
      const rows = (await window.pond.query(
        "saves.embeddings",
        {},
      )) as WireEmbedding[];
      const byId = new Map<string, EmbeddingEntry>();
      for (const row of rows) {
        if (!row.embedding || !row.embeddingModel) continue;
        byId.set(row.id, {
          vec: Float32Array.from(row.embedding),
          model: row.embeddingModel,
        });
      }
      store.setState(() => ({
        byId,
        loaded: true,
      }));
    } catch (err) {
      console.warn("[embeddings] failed to load persisted vectors", err);
      store.setState((s) => ({ ...s, loaded: true }));
    } finally {
      loadInflight = null;
    }
  })();
  return loadInflight;
}

export function setEmbedding(
  id: string,
  vec: Float32Array,
  model: string,
): void {
  store.setState((s) => {
    const byId = new Map(s.byId);
    byId.set(id, { vec, model });
    return { byId, loaded: s.loaded };
  });
  void window.pond
    .query("saves.setEmbedding", {
      id,
      embedding: Array.from(vec),
      embeddingModel: model,
    })
    .catch((err) => {
      console.warn(`[embeddings] failed to persist vector for ${id}`, err);
    });
}

export function clearEmbeddings(ids?: readonly string[]): number {
  if (ids && ids.length > 0) {
    let count = 0;
    store.setState((s) => {
      const byId = new Map(s.byId);
      for (const id of ids) if (byId.delete(id)) count++;
      return count === 0 ? s : { byId, loaded: s.loaded };
    });
    return count;
  }
  const count = store.state.byId.size;
  if (count === 0) return 0;
  store.setState((s) => ({
    byId: new Map(),
    loaded: s.loaded,
  }));
  return count;
}
