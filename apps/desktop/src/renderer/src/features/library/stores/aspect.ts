import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { pickPrimaryFile } from "@/core/data/media";
import type { Save } from "@/core/data/types";

const MIN_RATIO = 0.4;
const MAX_RATIO = 2.5;

const measuredAspects = new Map<string, number>();
const fallbackCache = new WeakMap<Save, number>();

/* Aspect ratios persist across sessions so the masonry doesn't shift
 * the second time you scroll through a card. Without this, every fresh
 * launch re-measures dim-less covers as their `<img>` lazy-loads,
 * triggering a re-pack cascade that's especially visible during fast
 * scrolling. The serialized blob is small (~30 bytes per save) and
 * tolerant of stale entries: if the cover changes, the next image
 * load updates the map and persists the corrected value. */
const STORAGE_KEY = "pond:aspects:v1";
const PERSIST_DEBOUNCE_MS = 800;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistDirty = false;

function clampRatio(w: number, h: number): number {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, w / h));
}

function hydrateFromStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        measuredAspects.set(id, value);
      }
    }
  } catch {
    // Storage corrupt / unavailable: start with an empty cache.
  }
}

function persistSoon(): void {
  persistDirty = true;
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    if (!persistDirty) return;
    persistDirty = false;
    if (typeof localStorage === "undefined") return;
    try {
      const obj: Record<string, number> = {};
      for (const [id, ratio] of measuredAspects) obj[id] = ratio;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage full / private browsing: drop the persistence pass.
    }
  }, PERSIST_DEBOUNCE_MS);
}

hydrateFromStorage();

export function aspectFor(save: Save): number {
  const measured = measuredAspects.get(save.id);
  if (measured !== undefined) return measured;
  const cached = fallbackCache.get(save);
  if (cached !== undefined) return cached;
  const primary = pickPrimaryFile(save);
  const w = primary?.width ?? save.width ?? null;
  const h = primary?.height ?? save.height ?? null;
  const ratio = w && h ? clampRatio(w, h) : 1;
  fallbackCache.set(save, ratio);
  return ratio;
}

// A monotonically-increasing version that bumps once per animation
// frame in which any aspect changed. `recordAspect` fires from `<img>`
// / `<video>` load handlers (outside React), so the coalescing has to
// live at module scope; a single on-demand rAF collapses a burst of
// measurements into one re-pack instead of one per loaded cover.
const versionStore = new Store(0);
let scheduled = 0;

function flush() {
  scheduled = 0;
  versionStore.setState((v) => v + 1);
}

function schedule() {
  if (scheduled !== 0) return;
  if (typeof requestAnimationFrame === "undefined") {
    flush();
    return;
  }
  scheduled = requestAnimationFrame(flush);
}

export function recordAspect(saveId: string, w: number, h: number): void {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
  const ratio = clampRatio(w, h);
  const prev = measuredAspects.get(saveId);
  if (prev !== undefined && Math.abs(prev - ratio) < 0.001) return;
  measuredAspects.set(saveId, ratio);
  persistSoon();
  schedule();
}

export function useAspectVersion(): number {
  return useStore(versionStore, (v) => v);
}
