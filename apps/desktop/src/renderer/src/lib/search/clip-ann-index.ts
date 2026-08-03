import type { HierarchicalNSW, HnswlibModule } from "hnswlib-wasm";
import { clipEmbeddingStore } from "@/stores/clip-embedding-store";
import { registerClipAnnDirty } from "./ann-dirty";

/** HNSW over CLIP image embeddings; same incremental + compact policy as text ANN. */

const SPACE = "cosine" as const;
const HNSW_M = 16;
const HNSW_EF_CONSTRUCTION = 200;
const HNSW_EF_SEARCH = 64;
const HNSW_SEED = 101;
const COMPACT_DEBOUNCE_MS = 2_000;
const COMPACT_EVERY_N = 500;

let mod: HnswlibModule | null = null;
let loadStarted = false;
let loadFailed = false;

let index: HierarchicalNSW | null = null;
let dim = 0;
let builtVersion = -1;
let nextLabel = 0;
const labelToId: string[] = [];
const idToLabel = new Map<string, number>();
let insertsSinceCompact = 0;
let compactTimer: ReturnType<typeof setTimeout> | null = null;
const dirtyIds = new Set<string>();
let needsFullRebuild = true;

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
      console.warn("[clip-ann] load failed; using linear fallback", err);
    });
}

function scheduleCompact(): void {
  if (compactTimer != null) clearTimeout(compactTimer);
  compactTimer = setTimeout(() => {
    compactTimer = null;
    needsFullRebuild = true;
    insertsSinceCompact = 0;
  }, COMPACT_DEBOUNCE_MS);
}

function noteDirty(ids: readonly string[] | "all"): void {
  if (ids === "all") {
    needsFullRebuild = true;
    dirtyIds.clear();
    scheduleCompact();
    return;
  }
  for (const id of ids) dirtyIds.add(id);
  insertsSinceCompact += ids.length;
  if (insertsSinceCompact >= COMPACT_EVERY_N) needsFullRebuild = true;
  scheduleCompact();
}

registerClipAnnDirty(noteDirty);

function rebuild(): void {
  if (!mod) return;
  const entries = clipEmbeddingStore.state.byId;
  labelToId.length = 0;
  idToLabel.clear();
  nextLabel = 0;
  dim = 0;
  for (const entry of entries.values()) {
    if (entry.vec.length > 0) {
      dim = entry.vec.length;
      break;
    }
  }
  if (dim === 0) {
    index = null;
    builtVersion = clipEmbeddingStore.state.version;
    needsFullRebuild = false;
    dirtyIds.clear();
    return;
  }
  const capacity = Math.max(32, entries.size * 2);
  const next = new mod.HierarchicalNSW(SPACE, dim, "");
  next.initIndex(capacity, HNSW_M, HNSW_EF_CONSTRUCTION, HNSW_SEED);
  next.setEfSearch(HNSW_EF_SEARCH);
  for (const [id, entry] of entries) {
    if (entry.vec.length !== dim) continue;
    const label = nextLabel++;
    next.addPoint(entry.vec, label, false);
    labelToId[label] = id;
    idToLabel.set(id, label);
  }
  index = next;
  builtVersion = clipEmbeddingStore.state.version;
  needsFullRebuild = false;
  dirtyIds.clear();
  insertsSinceCompact = 0;
}

function applyIncremental(): void {
  if (!mod || !index || dim === 0) {
    rebuild();
    return;
  }
  const entries = clipEmbeddingStore.state.byId;
  for (const id of dirtyIds) {
    const prevLabel = idToLabel.get(id);
    if (prevLabel != null) {
      try {
        index.markDelete(prevLabel);
      } catch {
        needsFullRebuild = true;
        rebuild();
        return;
      }
      idToLabel.delete(id);
    }
    const entry = entries.get(id);
    if (!entry || entry.vec.length !== dim) continue;
    const label = nextLabel++;
    try {
      index.addPoint(entry.vec, label, false);
    } catch {
      needsFullRebuild = true;
      rebuild();
      return;
    }
    labelToId[label] = id;
    idToLabel.set(id, label);
  }
  dirtyIds.clear();
  builtVersion = clipEmbeddingStore.state.version;
}

function ensureFresh(): void {
  if (!mod) return;
  if (needsFullRebuild || index === null) {
    try {
      rebuild();
    } catch (err) {
      console.warn("[clip-ann] rebuild failed; using linear fallback", err);
      index = null;
    }
    return;
  }
  if (dirtyIds.size > 0 || builtVersion !== clipEmbeddingStore.state.version) {
    try {
      if (dirtyIds.size === 0) needsFullRebuild = true;
      if (needsFullRebuild) rebuild();
      else applyIncremental();
    } catch (err) {
      console.warn("[clip-ann] incremental update failed; rebuilding", err);
      try {
        rebuild();
      } catch {
        index = null;
      }
    }
  }
}

export function clipAnnNearest(
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
      if (id != null && idToLabel.has(id)) {
        out.push({ id, score: 1 - (res.distances[i] ?? 1) });
      }
    });
    return out;
  } catch (err) {
    console.warn("[clip-ann] search failed; using linear fallback", err);
    return null;
  }
}
