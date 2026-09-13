import type { ImageCrop } from "@pond/schema/db";

interface ImageBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}
export function containImage(
  frame: ImageBounds,
  ratio: number | null,
): ImageBounds {
  if (!ratio || !frame.width || !frame.height) return frame;
  const width = Math.min(frame.width, frame.height * ratio);
  const height = width / ratio;
  return {
    left: frame.left + (frame.width - width) / 2,
    top: frame.top + (frame.height - height) / 2,
    width,
    height,
  };
}
export function imagePoint(bounds: ImageBounds, x: number, y: number) {
  return clampImagePoint({
    x: (x - bounds.left) / bounds.width,
    y: (y - bounds.top) / bounds.height,
  });
}

export function clampImagePoint(point: { x: number; y: number }) {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

export function inImage(point: { x: number; y: number }) {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

export function viewToImagePoint(
  frame: ImageBounds,
  pose: { x: number; y: number; zoom: number },
  ratio: number | null,
  clientX: number,
  clientY: number,
) {
  const zoom = pose.zoom || 1;
  const localX =
    (clientX - frame.left - frame.width / 2 - pose.x) / zoom + frame.width / 2;
  const localY =
    (clientY - frame.top - frame.height / 2 - pose.y) / zoom + frame.height / 2;
  const bounds = containImage(
    { left: 0, top: 0, width: frame.width, height: frame.height },
    ratio,
  );
  if (!bounds.width || !bounds.height) return { x: 0, y: 0 };
  return {
    x: (localX - bounds.left) / bounds.width,
    y: (localY - bounds.top) / bounds.height,
  };
}
export function validImageRegion(region: ImageCrop): boolean {
  return (
    [region.x, region.y, region.w, region.h].every(Number.isFinite) &&
    region.x >= 0 &&
    region.y >= 0 &&
    region.w > 0 &&
    region.h > 0 &&
    region.x + region.w <= 1.000001 &&
    region.y + region.h <= 1.000001
  );
}

const COMMENT_PIN = 0.02;
const COMMENT_AREA = 0.04;

export function pinRegion(point: { x: number; y: number }): ImageCrop {
  return {
    x: Math.min(Math.max(0, point.x), 1 - COMMENT_PIN),
    y: Math.min(Math.max(0, point.y), 1 - COMMENT_PIN),
    w: COMMENT_PIN,
    h: COMMENT_PIN,
  };
}

export function isAreaComment(region: ImageCrop): boolean {
  return region.w >= COMMENT_AREA || region.h >= COMMENT_AREA;
}

export function commentFromGesture(
  start: { x: number; y: number },
  end: { x: number; y: number },
): ImageCrop {
  const region = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
  return isAreaComment(region) ? region : pinRegion(start);
}

const MIN_CROP = 0.001;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function nudgeCrop(
  crop: ImageCrop,
  dx: number,
  dy: number,
  dw = 0,
  dh = 0,
): ImageCrop {
  if (dw !== 0 || dh !== 0) {
    return {
      x: crop.x,
      y: crop.y,
      w: Math.min(1 - crop.x, Math.max(MIN_CROP, crop.w + dw)),
      h: Math.min(1 - crop.y, Math.max(MIN_CROP, crop.h + dh)),
    };
  }
  return {
    x: Math.min(Math.max(0, crop.x + dx), 1 - crop.w),
    y: Math.min(Math.max(0, crop.y + dy), 1 - crop.h),
    w: crop.w,
    h: crop.h,
  };
}

export type CropHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export const CROP_HANDLES: readonly CropHandle[] = [
  "n",
  "s",
  "e",
  "w",
  "nw",
  "ne",
  "sw",
  "se",
];

export function cropContains(
  crop: ImageCrop,
  point: { x: number; y: number },
): boolean {
  return (
    point.x >= crop.x &&
    point.x <= crop.x + crop.w &&
    point.y >= crop.y &&
    point.y <= crop.y + crop.h
  );
}

export function resizeCrop(
  origin: ImageCrop,
  handle: CropHandle,
  point: { x: number; y: number },
): ImageCrop {
  const right = origin.x + origin.w;
  const bottom = origin.y + origin.h;
  let x = origin.x;
  let y = origin.y;
  let w = origin.w;
  let h = origin.h;
  if (handle.includes("w")) {
    x = Math.min(Math.max(0, point.x), right - MIN_CROP);
    w = right - x;
  } else if (handle.includes("e")) {
    w = Math.min(1 - origin.x, Math.max(MIN_CROP, point.x - origin.x));
  }
  if (handle.includes("n")) {
    y = Math.min(Math.max(0, point.y), bottom - MIN_CROP);
    h = bottom - y;
  } else if (handle.includes("s")) {
    h = Math.min(1 - origin.y, Math.max(MIN_CROP, point.y - origin.y));
  }
  return { x, y, w, h };
}

export function lockCropAspect(crop: ImageCrop, ratio: number): ImageCrop {
  if (!Number.isFinite(ratio) || ratio <= 0) return crop;
  const next =
    crop.w / crop.h > ratio
      ? { ...crop, w: crop.h * ratio }
      : { ...crop, h: crop.w / ratio };
  return {
    x: clamp01(next.x),
    y: clamp01(next.y),
    w: Math.min(next.w, 1 - clamp01(next.x)),
    h: Math.min(next.h, 1 - clamp01(next.y)),
  };
}
