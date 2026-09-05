import type { ImageCrop } from "@pond/schema/db";
import type { CSSProperties } from "react";
import type { Save } from "@/features/saves/types";

export function mediaTransformStyle(save: Save): CSSProperties {
  const parts: string[] = [];
  if (save.rotate) parts.push(`rotate(${save.rotate}deg)`);
  if (save.flipX) parts.push("scaleX(-1)");
  if (save.flipY) parts.push("scaleY(-1)");
  const style: CSSProperties = {};
  if (parts.length > 0) style.transform = parts.join(" ");
  if (save.crop) style.clipPath = cropClip(save.crop);
  return style;
}

function cropClip(crop: ImageCrop): string {
  const left = Math.max(0, Math.min(100, crop.x * 100));
  const top = Math.max(0, Math.min(100, crop.y * 100));
  const right = Math.max(0, Math.min(100, 100 - (crop.x + crop.w) * 100));
  const bottom = Math.max(0, Math.min(100, 100 - (crop.y + crop.h) * 100));
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
}
