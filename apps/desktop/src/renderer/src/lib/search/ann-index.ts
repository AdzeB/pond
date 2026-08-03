import type { HierarchicalNSW, HnswlibModule } from "hnswlib-wasm";
import { embeddingStore } from "@/stores/embedding-store";
import { registerTextAnnDirty } from "./ann-dirty";

/**
 * HNSW over text embeddings. Incremental add/markDelete between queries; a debounced full rebuild keeps recall healthy after churn.
 */

const SPACE = "cosine" as const;
const HNSW_M = 16;
const HNSW_EF_CONSTRUCTION = 200;
const HNSW_EF_SEARCH = 64;
const HNSW_SEED = 100;
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
      console.warn("[ann] load failed; using linear fallback", err);
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

function rebuild(): void {
  if (!mod) return;
  const entries = embeddingStore.state.byId;
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
    builtVersion = embeddingStore.state.version;
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
  builtVersion = embeddingStore.state.version;
  needsFullRebuild = false;
  dirtyIds.clear();
  insertsSinceCompact = 0;
}

function applyIncremental(): void {
  if (!mod || !index || dim === 0) {
    rebuild();
    return;
  }
  const entries = embeddingStore.state.byId;
  try {
    if (
      typeof (index as HierarchicalNSW & { resizeIndex?: (n: number) => void })
        .resizeIndex === "function" &&
      nextLabel + dirtyIds.size >= index.getMaxElements()
    ) {
      (
        index as HierarchicalNSW & { resizeIndex: (n: number) => void }
      ).resizeIndex(Math.max(index.getMaxElements() * 2, nextLabel + 64));
    }
  } catch {
    needsFullRebuild = true;
    rebuild();
    return;
  }

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
  builtVersion = embeddingStore.state.version;
}

function ensureFresh(): void {
  if (!mod) return;
  if (needsFullRebuild || index === null) {
    try {
      rebuild();
    } catch (err) {
      console.warn("[ann] rebuild failed; using linear fallback", err);
      index = null;
    }
    return;
  }
  if (dirtyIds.size > 0 || builtVersion !== embeddingStore.state.version) {
    try {
      if (dirtyIds.size === 0) needsFullRebuild = true;
      if (needsFullRebuild) rebuild();
      else applyIncremental();
    } catch (err) {
      console.warn("[ann] incremental update failed; rebuilding", err);
      try {
        rebuild();
      } catch {
        index = null;
      }
    }
  }
}

registerTextAnnDirty(noteDirty);

/** Returns null when the index isn't ready so callers fall back to a linear scan. */
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
      if (id != null && idToLabel.has(id)) {
        out.push({ id, score: 1 - (res.distances[i] ?? 1) });
      }
    });
    return out;
  } catch (err) {
    console.warn("[ann] search failed; using linear fallback", err);
    return null;
  }
}
