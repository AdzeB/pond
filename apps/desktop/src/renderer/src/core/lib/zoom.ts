// Shared grid zoom bounds and storage key; live state lives in stores/view-store.
export const ZOOM_MIN = 80;
export const ZOOM_MAX = 240;
export const ZOOM_DEFAULT = 130;
export const ZOOM_STORAGE_KEY = "pond.gridZoom";

export function clampZoom(n: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
}
