import { clamp } from "@/lib/util/math";

// Shared grid zoom bounds and storage key; live state lives in stores/view-store.
export const ZOOM_MIN = 80;
export const ZOOM_MAX = 240;
export const ZOOM_DEFAULT = 130;
export const ZOOM_STORAGE_KEY = "pond.gridZoom";

export function clampZoom(n: number): number {
  return clamp(n, ZOOM_MIN, ZOOM_MAX);
}
