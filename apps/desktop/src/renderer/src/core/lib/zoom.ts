// Grid zoom bounds and persistence key. The live zoom state lives in
// `stores/view-store`; this module is just the shared constants so the
// store and the zoom UI agree on the same range and storage key.
export const ZOOM_MIN = 80;
export const ZOOM_MAX = 240;
export const ZOOM_DEFAULT = 130;
export const ZOOM_STORAGE_KEY = "pond.gridZoom";

export function clampZoom(n: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
}
