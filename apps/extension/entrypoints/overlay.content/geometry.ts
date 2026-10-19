import type { CaptureRegion } from "@/utils/messaging";

export interface Point {
  x: number;
  y: number;
}

export function clampPoint(x: number, y: number): Point {
  return {
    x: Math.min(innerWidth, Math.max(0, x)),
    y: Math.min(innerHeight, Math.max(0, y)),
  };
}

/** Screenshots only see the viewport, so clip to it and drop slivers too small to save. */
export function viewportRegion(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CaptureRegion | null {
  const start = clampPoint(rect.x, rect.y);
  const end = clampPoint(rect.x + rect.width, rect.y + rect.height);
  const width = end.x - start.x;
  const height = end.y - start.y;
  if (width < 2 || height < 2) return null;
  return {
    ...start,
    width,
    height,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
  };
}

export function regionBetween(a: Point, b: Point): CaptureRegion | null {
  return viewportRegion({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  });
}
