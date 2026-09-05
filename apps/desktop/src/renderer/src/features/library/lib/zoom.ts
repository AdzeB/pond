import { clamp } from "@/shared/lib/math";

const ZOOM_MIN = 80;
const ZOOM_MAX = 240;
export const ZOOM_DEFAULT = 130;
export const ZOOM_STORAGE_KEY = "pond.gridZoom";

export const ZOOM_STEPS: ReadonlyArray<{ value: number; label: string }> = [
  { value: ZOOM_MIN, label: "Tiny" },
  { value: 105, label: "Small" },
  { value: ZOOM_DEFAULT, label: "Medium" },
  { value: 155, label: "Large" },
  { value: 185, label: "Huge" },
  { value: ZOOM_MAX, label: "Giant" },
];

export function clampZoom(n: number): number {
  return clamp(n, ZOOM_MIN, ZOOM_MAX);
}

export function nearestZoomIndex(zoom: number): number {
  let best = 0;
  let bestDelta = Number.POSITIVE_INFINITY;
  ZOOM_STEPS.forEach((step, index) => {
    const delta = Math.abs(zoom - step.value);
    if (delta < bestDelta) {
      best = index;
      bestDelta = delta;
    }
  });
  return best;
}
