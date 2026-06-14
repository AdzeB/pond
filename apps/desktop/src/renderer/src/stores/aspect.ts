import { debounce } from "@tanstack/pacer";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { clamp } from "@/lib/math";
import { pickPrimaryFile } from "@/lib/media";
import type { Save } from "@/lib/types";

export const MIN_RATIO = 0.4;
export const MAX_RATIO = 2.5;

const measuredAspects = new Map<string, number>();
const fallbackCache = new WeakMap<Save, number>();

// Persist aspect ratios so the masonry doesn't re-pack as dim-less covers lazy-load; stale entries self-correct on next load.
const STORAGE_KEY = "pond:aspects:v1";
const PERSIST_DEBOUNCE_MS = 800;

export function clampRatio(w: number, h: number): number {
  return clamp(w / h, MIN_RATIO, MAX_RATIO);
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

const persistSoon = debounce(
  () => {
    if (typeof localStorage === "undefined") return;
    try {
      const obj: Record<string, number> = {};
      for (const [id, ratio] of measuredAspects) obj[id] = ratio;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage full / private browsing: drop the persistence pass.
    }
  },
  { wait: PERSIST_DEBOUNCE_MS },
);

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

// Version bumped once per rAF in which any aspect changed; coalesces a burst of measurements into one re-pack.
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
  return useSelector(versionStore, (v) => v);
}
