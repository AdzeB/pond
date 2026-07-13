import { RawImage } from "@huggingface/transformers";
import { pickPrimaryUnit } from "@/lib/media/units";
import type { Save } from "@/lib/types";

/** Kept free of model logic so enrichers depend on it only for resolving and fetching a save's representative frame. */

/** Primary image or video poster; null until something's classifiable. */
export function representativeImageUrl(save: Save): string | null {
  const unit = pickPrimaryUnit(save);
  if (!unit) return null;
  return unit.isVideo ? (unit.posterUrl ?? null) : unit.url;
}

/** img crossOrigin is rejected for the pond:// scheme, so fetch the bytes and hand the Blob to transformers.js. */
export async function loadImage(url: string): Promise<RawImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  return RawImage.fromBlob(await res.blob());
}
