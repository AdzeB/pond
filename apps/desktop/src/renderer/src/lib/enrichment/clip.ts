import type { RawImage } from "@huggingface/transformers";
import { getPrefsSnapshot } from "@/stores/prefs";
import { inferClipAesthetic, inferClipImage } from "./inference-client";

// CLIP: image embeddings (visual similarity / related / near-dup) and zero-shot
// aesthetic labelling. Model loading + execution lives in the inference worker
// (inference-core); this module resolves the prefs-driven model id and stamp.

const DEFAULT_MODEL_ID = "Xenova/clip-vit-base-patch32";

function modelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.clipModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

export function clipModelVersion(): string {
  return `${modelId()}@1`;
}

// Fixed style vocabulary for zero-shot aesthetic tagging.
export const AESTHETIC_LABELS = [
  "minimalist",
  "maximalist",
  "vintage",
  "modern",
  "brutalist",
  "colorful",
  "monochrome",
  "dark",
  "bright",
  "illustration",
  "photograph",
  "3d render",
  "diagram",
  "screenshot",
  "typography",
] as const;

// Normalized CLIP image embedding for visual similarity.
export function clipImageEmbedding(image: RawImage): Promise<Float32Array> {
  return inferClipImage(image, modelId());
}

// Top aesthetic/style labels for an image, above a confidence floor.
export function clipAesthetic(image: RawImage): Promise<string[]> {
  return inferClipAesthetic(image, [...AESTHETIC_LABELS], modelId());
}
