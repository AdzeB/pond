export interface PositionedItem {
  top: number;
  height: number;
}

export type VisibilityMode = "monotonic" | "scan";

const OVERSCAN_PX = 1600;

function lowerBoundMonotonic<T extends PositionedItem>(
  items: T[],
  viewMin: number,
): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const item = items[mid];
    if (!item || item.top + item.height < viewMin) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBoundMonotonic<T extends PositionedItem>(
  items: T[],
  viewMax: number,
): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const item = items[mid];
    if (!item || item.top <= viewMax) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function computeVisibleMonotonic<T extends PositionedItem>(
  items: T[],
  viewMin: number,
  viewMax: number,
): number[] {
  const start = lowerBoundMonotonic(items, viewMin);
  const end = upperBoundMonotonic(items, viewMax);
  const out: number[] = [];
  for (let i = start; i < end; i++) out.push(i);
  return out;
}

function computeVisibleScan<T extends PositionedItem>(
  items: T[],
  viewMin: number,
  viewMax: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (item.top + item.height < viewMin) continue;
    if (item.top > viewMax) continue;
    out.push(i);
  }
  return out;
}

export function computeVisible<T extends PositionedItem>(
  items: T[],
  offsetWithinGrid: number,
  viewportH: number,
  mode: VisibilityMode = "scan",
): number[] {
  const viewMin = offsetWithinGrid - OVERSCAN_PX;
  const viewMax = offsetWithinGrid + viewportH + OVERSCAN_PX;
  return mode === "monotonic"
    ? computeVisibleMonotonic(items, viewMin, viewMax)
    : computeVisibleScan(items, viewMin, viewMax);
}
