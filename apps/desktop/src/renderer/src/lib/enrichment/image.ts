import { RawImage } from "@huggingface/transformers";
import { pickPrimaryUnit } from "@/lib/media/units";
import type { Save } from "@/lib/types";

// Shared image-loading helpers for the on-device enrichers (caption, OCR, CLIP,
// aesthetic). Kept free of any model logic so enrichers only depend on it for
// resolving and fetching a save's representative frame.

// Best frame for a save: primary image or video poster; null until something's
// classifiable.
export function representativeImageUrl(save: Save): string | null {
  const unit = pickPrimaryUnit(save);
  if (!unit) return null;
  return unit.isVideo ? (unit.posterUrl ?? null) : unit.url;
}

// Fetch the bytes (img crossOrigin is rejected for the pond:// scheme) and hand
// the Blob to transformers.js.
export async function loadImage(url: string): Promise<RawImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  return RawImage.fromBlob(await res.blob());
}
