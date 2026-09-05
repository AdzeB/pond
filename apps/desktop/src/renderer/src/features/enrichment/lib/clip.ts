import type { RawImage } from "@huggingface/transformers";
import { clipEmbeddingVersion, DEFAULT_CLIP_MODEL } from "@shared/embeddings";
import { getPrefsSnapshot } from "@/features/settings/state/prefs";
import { inferClipAesthetic, inferClipImage } from "./inference-client";

function modelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.clipModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_CLIP_MODEL;
}

export function clipModelVersion(): string {
  return clipEmbeddingVersion(modelId());
}

const AESTHETIC_LABELS = [
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

export function clipImageEmbedding(image: RawImage): Promise<Float32Array> {
  return inferClipImage(image, modelId());
}

export function clipAesthetic(image: RawImage): Promise<string[]> {
  return inferClipAesthetic(image, [...AESTHETIC_LABELS], modelId());
}
