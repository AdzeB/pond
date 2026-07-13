import type { HierarchicalNSW, HnswlibModule } from "hnswlib-wasm";
import { embeddingStore } from "@/stores/embedding-store";

/**
 * HNSW (hnswlib-wasm) index over the on-device text embeddings for whole-library top-K scans; the WASM module loads asynchronously while ranking stays synchronous, so annNearest returns null until ready and callers keep a linear cosine fallback.
 * @remarks Rebuilt lazily when the embedding store's version moves — at most one rebuild per query, only when embeddings changed.
 */

const SPACE = "cosine" as const;
/** m/efConstruction are the library defaults; efSearch trades recall for speed at query time. */
const HNSW_M = 16;
const HNSW_EF_CONSTRUCTION = 200;
const HNSW_EF_SEARCH = 64;
const HNSW_SEED = 100;

let mod: HnswlibModule | null = null;
let loadStarted = false;
let loadFailed = false;

let index: HierarchicalNSW | null = null;
let dim = 0;
let builtVersion = -1;
const labelToId: string[] = [];

function kickLoad(): void {
  if (loadStarted || loadFailed) return;
  loadStarted = true;
  void import("hnswlib-wasm")
    .then(({ loadHnswlib }) => loadHnswlib())
    .then((m) => {
      mod = m;
    })
    .catch((err) => {
      loadFailed = true;
      console.warn("[ann] load failed; using linear fallback", err);
    });
}

/** Vectors whose dimensionality differs from the first (mid model-version change) are skipped; the store's version bump re-triggers the rebuild. */
function rebuild(): void {
  if (!mod) return;
  const entries = embeddingStore.state.byId;
  labelToId.length = 0;
  dim = 0;
  for (const entry of entries.values()) {
    if (entry.vec.length > 0) {
      dim = entry.vec.length;
      break;
    }
  }
  if (dim === 0) {
    index = null;
    builtVersion = embeddingStore.state.version;
    return;
  }
  const capacity = Math.max(16, entries.size);
  const next = new mod.HierarchicalNSW(SPACE, dim, "");
  next.initIndex(capacity, HNSW_M, HNSW_EF_CONSTRUCTION, HNSW_SEED);
  next.setEfSearch(HNSW_EF_SEARCH);
  let label = 0;
  for (const [id, entry] of entries) {
    if (entry.vec.length !== dim) continue;
    next.addPoint(entry.vec, label, false);
    labelToId[label] = id;
    label += 1;
  }
  index = next;
  builtVersion = embeddingStore.state.version;
}

function ensureFresh(): void {
  if (!mod) return;
  if (index === null || builtVersion !== embeddingStore.state.version) {
    try {
      rebuild();
    } catch (err) {
      console.warn("[ann] rebuild failed; using linear fallback", err);
      index = null;
    }
  }
}

/** Returns null when the index isn't ready so callers fall back to a linear scan; score is cosine similarity in [-1, 1] (1 - HNSW distance). */
export function annNearest(
  vector: Float32Array,
  k: number,
): Array<{ id: string; score: number }> | null {
  if (!mod) {
    kickLoad();
    return null;
  }
  ensureFresh();
  if (!index || dim === 0 || vector.length !== dim) return null;
  const count = index.getCurrentCount();
  if (count === 0) return null;
  try {
    const res = index.searchKnn(vector, Math.min(k, count), undefined);
    const out: Array<{ id: string; score: number }> = [];
    res.neighbors.forEach((label, i) => {
      const id = labelToId[label];
      if (id != null) out.push({ id, score: 1 - (res.distances[i] ?? 1) });
    });
    return out;
  } catch (err) {
    console.warn("[ann] search failed; using linear fallback", err);
    return null;
  }
}
