import type { RawImage } from "@huggingface/transformers";
import { getPrefsSnapshot } from "@/stores/prefs";
import { inferClipAesthetic, inferClipImage } from "./inference-client";

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
