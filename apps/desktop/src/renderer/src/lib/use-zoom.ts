import { useCallback, useEffect, useState } from "react";

export const ZOOM_MIN = 80;
export const ZOOM_MAX = 240;
export const ZOOM_STEP = 10;

const ZOOM_DEFAULT = 130;
const STORAGE_KEY = "pond.gridZoom";

function clamp(n: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
}

export function useZoom(): [number, (next: number) => void] {
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return ZOOM_DEFAULT;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? clamp(parsed) : ZOOM_DEFAULT;
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--grid-min", `${zoom}px`);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(zoom));
    } catch {
      /* fail silently if storage is denied */
    }
  }, [zoom]);

  const set = useCallback((next: number) => setZoom(clamp(next)), []);

  return [zoom, set];
}
