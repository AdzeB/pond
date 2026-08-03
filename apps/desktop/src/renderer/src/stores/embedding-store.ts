import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { annMarkDirty } from "@/lib/search/ann-dirty";

/** Per-save embedding vectors: loaded once on startup (vectors are excluded from saves.list to keep it small), kept current by the sweep; `version` bumps on every mutation so semantic-rank consumers re-run. */

interface EmbeddingEntry {
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

/** Idempotent. */
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
      annMarkDirty("all");
    } catch (err) {
      console.warn("[embeddings] failed to load persisted vectors", err);
      store.setState((s) => ({ ...s, loaded: true }));
    } finally {
      loadInflight = null;
    }
  })();
  return loadInflight;
}

/** Persists through IPC, fire-and-forget. */
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
  annMarkDirty([id]);
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

/** Dropping in-memory vectors makes the enricher re-embed those saves; persisted rows are overwritten as each fresh vector lands, so nothing is permanently lost. */
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
    if (count > 0) annMarkDirty(ids);
    return count;
  }
  const count = store.state.byId.size;
  if (count === 0) return 0;
  store.setState((s) => ({
    byId: new Map(),
    version: s.version + 1,
    loaded: s.loaded,
  }));
  annMarkDirty("all");
  return count;
}

export function useEmbeddingVersion(): number {
  return useSelector(store, (s) => s.version);
}
