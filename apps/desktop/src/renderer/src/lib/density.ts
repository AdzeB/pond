import { useSyncExternalStore } from "react";

export type Density = "compact" | "comfortable" | "spacious";

const DENSITY_ITEM_GAP: Record<Density, number> = {
  compact: 8,
  comfortable: 16,
  spacious: 28,
};

const DEFAULT_DENSITY: Density = "comfortable";

const STORAGE_KEY = "pond.display.density";

const VALID = new Set<Density>(["compact", "comfortable", "spacious"]);

function isDensity(value: string | null): value is Density {
  return value !== null && VALID.has(value as Density);
}

function read(): Density {
  if (typeof window === "undefined") return DEFAULT_DENSITY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isDensity(raw) ? raw : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

const listeners = new Set<() => void>();
let snapshot: Density = read();

function emit() {
  snapshot = read();
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): Density {
  return snapshot;
}

export function setDensity(next: Density): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage denied — keep the in-memory snapshot in sync anyway */
    }
  }
  emit();
}

export function useDensity(): Density {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useItemGap(): number {
  return DENSITY_ITEM_GAP[useDensity()];
}
