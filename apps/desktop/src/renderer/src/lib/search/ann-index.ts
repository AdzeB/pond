import type { HierarchicalNSW, HnswlibModule } from "hnswlib-wasm";
import { embeddingStore } from "@/stores/embedding-store";

// Approximate nearest-neighbour index (HNSW via hnswlib-wasm) over the on-device
// text embeddings. It accelerates the whole-library "find by meaning" top-K
// scans. The WASM module loads asynchronously while ranking stays synchronous,
// so annNearest returns null until the module is ready (and forever if it fails
// to load); every caller keeps a linear cosine fallback, so search always works.
//
// The index is rebuilt lazily when the embedding store's version moves (cheap:
// at most one rebuild per query, and only when embeddings actually changed),
// which subsumes maintenance on setEmbedding/loadEmbeddings/clearEmbeddings.

const SPACE = "cosine" as const;
// HNSW build params: m (graph degree) / efConstruction (build accuracy) are the
// library defaults; efSearch trades recall for speed at query time.
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

// Rebuild the index from the current embedding store snapshot. Vectors whose
// dimensionality doesn't match the first one (e.g. mid model-version change) are
// skipped; the store bumps its version on every mutation, which re-triggers this.
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

// Global K nearest saves to a query vector, as {id, similarity}. Returns null
// when the index isn't ready (module still loading or failed), so callers fall
// back to a linear scan. Similarity is cosine in [-1, 1] (1 - HNSW distance).
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
