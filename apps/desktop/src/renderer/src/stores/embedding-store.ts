import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// In-memory store of per-save embedding vectors. Loaded once from the DB on
// startup (vectors are excluded from saves.list to keep that payload small) and
// kept current by the embedding sweep. `version` bumps on every mutation so
// semantic-rank consumers re-run when new vectors arrive.

export interface EmbeddingEntry {
  vec: Float32Array;
  model: string;
}

interface EmbeddingState {
  readonly byId: Map<string, EmbeddingEntry>;
  readonly version: number;
  readonly loaded: boolean;
}

const store = new Store<EmbeddingState>({
  byId: new Map(),
  version: 0,
  loaded: false,
});

export const embeddingStore = store;

interface WireEmbedding {
  id: string;
  embedding: number[] | null;
  embeddingModel: string | null;
}

let loadInflight: Promise<void> | null = null;

// Hydrate the store from persisted embeddings. Idempotent.
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
      store.setState((s) => ({
        byId,
        version: s.version + 1,
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

export function getEmbedding(id: string): EmbeddingEntry | undefined {
  return store.state.byId.get(id);
}

// Record a freshly-computed vector (and persist it through IPC, fire-and-forget).
export function setEmbedding(
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
    .query("saves.setEmbedding", {
      id,
      embedding: Array.from(vec),
      embeddingModel: model,
    })
    .catch((err) => {
      console.warn(`[embeddings] failed to persist vector for ${id}`, err);
    });
}

// Drop in-memory vectors so the embedding enricher treats those saves as
// eligible again and re-embeds them. Pass `ids` to scope to a selection; omit to
// drop everything. Persisted rows are overwritten as each fresh vector lands, so
// nothing is permanently lost.
export function clearEmbeddings(ids?: readonly string[]): number {
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

export function useEmbeddingVersion(): number {
  return useSelector(store, (s) => s.version);
}
