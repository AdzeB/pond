import { debounce } from "@tanstack/pacer";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import {
  type MediaPickOptions,
  type MediaUnit,
  pickPrimaryUnit,
} from "@/lib/media/units";
import { pondScopedKey } from "@/lib/pond-scope";
import type { Save } from "@/lib/types";
import { clamp } from "@/lib/util/math";

const MIN_RATIO = 0.4;
const MAX_RATIO = 2.5;
const MAX_MEASURED = 5000;
/** Quiet measurements flush on the next frame; scroll bursts wait so packing does not run every rAF. */
const BURST_DEBOUNCE_MS = 120;
const BURST_WINDOW_MS = 50;
/** Video stream dims are noisier than posters; only displace an existing measurement past this. */
const SOFT_MIN_DELTA = 0.03;
const HARD_MIN_DELTA = 0.001;

/**
 * Persisting aspect ratios keeps the masonry from re-packing as dim-less covers lazy-load; stale entries self-correct on next load.
 * @remarks Keyed by pond id: save ids are pond-specific and the cache must not mix ponds.
 */
const STORAGE_KEY = pondScopedKey("pond:aspects:v4");
const PERSIST_DEBOUNCE_MS = 800;

/** Insertion-ordered map so the oldest measured entries can be evicted. */
const measuredAspects = new Map<string, number>();
const fallbackCache = new WeakMap<Save, Map<string, number>>();
const coverKeyCache = new WeakMap<Save, Map<string, string>>();

export function clampRatio(w: number, h: number): number {
  return clamp(w / h, MIN_RATIO, MAX_RATIO);
}

/** Cover path used as the measured-aspect key suffix for a media unit. */
export function aspectCoverKey(unit: MediaUnit | null): string {
  if (!unit) return "";
  return unit.isVideo ? (unit.posterKey ?? unit.key) : unit.key;
}

function optsCacheKey(opts: MediaPickOptions): string {
  return `${opts.theme ?? ""}:${opts.tweetCover ?? ""}`;
}

function coverKeyForSave(save: Save, opts: MediaPickOptions): string {
  let byOpts = coverKeyCache.get(save);
  if (!byOpts) {
    byOpts = new Map();
    coverKeyCache.set(save, byOpts);
  }
  const fingerprint = optsCacheKey(opts);
  const cached = byOpts.get(fingerprint);
  if (cached !== undefined) return cached;
  const coverKey = aspectCoverKey(pickPrimaryUnit(save, opts));
  byOpts.set(fingerprint, coverKey);
  return coverKey;
}

function measuredKey(saveId: string, coverKey: string): string {
  return coverKey ? `${saveId}:${coverKey}` : saveId;
}

/**
 * Video cards use stream/save dims only so a mismatched platform thumb cannot reshape the masonry.
 * @remarks YouTube Shorts thumbs are often 16:9 while the video is 9:16.
 */
export function aspectDimsFor(
  save: Save,
  opts: MediaPickOptions = {},
  unit = pickPrimaryUnit(save, opts),
): { w: number | null; h: number | null } {
  const files = save.files ?? [];
  const primary = unit
    ? (files.find((f) => f.path === unit.key) ?? null)
    : null;
  if (unit?.isVideo) {
    const dims =
      dimPair(primary?.width, primary?.height) ??
      dimPair(save.width, save.height);
    return dims ?? { w: null, h: null };
  }
  const dims =
    dimPair(primary?.width, primary?.height) ??
    dimPair(save.width, save.height);
  return dims ?? { w: null, h: null };
}

function dimPair(
  w: number | null | undefined,
  h: number | null | undefined,
): { w: number; h: number } | null {
  if (
    w == null ||
    h == null ||
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w <= 0 ||
    h <= 0
  ) {
    return null;
  }
  return { w, h };
}

function touchMeasured(key: string, ratio: number): void {
  if (measuredAspects.has(key)) measuredAspects.delete(key);
  measuredAspects.set(key, ratio);
  while (measuredAspects.size > MAX_MEASURED) {
    const oldest = measuredAspects.keys().next().value;
    if (typeof oldest !== "string") return;
    measuredAspects.delete(oldest);
  }
}

function hydrateFromStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" &&
        Number.isFinite(entry[1]) &&
        entry[1] > 0,
    );
    const start = Math.max(0, entries.length - MAX_MEASURED);
    for (const [id, value] of entries.slice(start)) {
      measuredAspects.set(id, value);
    }
  } catch {
    /** Storage corrupt / unavailable: start with an empty cache. */
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
      /** Storage full / private browsing: drop the persistence pass. */
    }
  },
  { wait: PERSIST_DEBOUNCE_MS },
);

hydrateFromStorage();

export function aspectFor(save: Save, opts: MediaPickOptions = {}): number {
  const coverKey = coverKeyForSave(save, opts);
  const key = measuredKey(save.id, coverKey);
  const measured = measuredAspects.get(key);
  if (measured !== undefined) return measured;
  /** Bare save-id keys still apply when a cover-scoped entry is missing. */
  if (coverKey) {
    const legacy = measuredAspects.get(save.id);
    if (legacy !== undefined) {
      touchMeasured(key, legacy);
      measuredAspects.delete(save.id);
      return legacy;
    }
  }
  let byCover = fallbackCache.get(save);
  if (!byCover) {
    byCover = new Map();
    fallbackCache.set(save, byCover);
  }
  const cached = byCover.get(coverKey);
  if (cached !== undefined) return cached;
  const unit = pickPrimaryUnit(save, opts);
  const { w, h } = aspectDimsFor(save, opts, unit);
  const ratio = w && h ? clampRatio(w, h) : 1;
  byCover.set(coverKey, ratio);
  return ratio;
}

const versionStore = new Store(0);
let rafScheduled = 0;
let burstTimer: ReturnType<typeof setTimeout> | 0 = 0;
let lastRecordAt = 0;

function flush() {
  rafScheduled = 0;
  if (burstTimer !== 0) {
    clearTimeout(burstTimer);
    burstTimer = 0;
  }
  versionStore.setState((v) => v + 1);
}

function schedule() {
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const gap = now - lastRecordAt;
  lastRecordAt = now;

  if (gap < BURST_WINDOW_MS) {
    if (rafScheduled !== 0) {
      cancelAnimationFrame(rafScheduled);
      rafScheduled = 0;
    }
    if (burstTimer !== 0) clearTimeout(burstTimer);
    burstTimer = setTimeout(flush, BURST_DEBOUNCE_MS);
    return;
  }

  if (burstTimer !== 0) return;
  if (rafScheduled !== 0) return;
  if (typeof requestAnimationFrame === "undefined") {
    flush();
    return;
  }
  rafScheduled = requestAnimationFrame(flush);
}

export function recordAspect(
  saveId: string,
  w: number,
  h: number,
  opts: { soft?: boolean; coverKey?: string } = {},
): void {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
  const ratio = clampRatio(w, h);
  const key = measuredKey(saveId, opts.coverKey ?? "");
  const prev = measuredAspects.get(key);
  const minDelta = opts.soft ? SOFT_MIN_DELTA : HARD_MIN_DELTA;
  if (prev !== undefined && Math.abs(prev - ratio) < minDelta) return;
  touchMeasured(key, ratio);
  persistSoon();
  schedule();
}

export function useAspectVersion(): number {
  return useSelector(versionStore, (v) => v);
}
