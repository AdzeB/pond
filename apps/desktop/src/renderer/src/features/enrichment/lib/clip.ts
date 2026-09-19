import type { RawImage } from "@huggingface/transformers";
import { clipEmbeddingVersion } from "@shared/embeddings";
import { inferClipAesthetic, inferClipImage } from "./inference-client";

export function clipModelVersion(): string {
  return clipEmbeddingVersion();
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
  return inferClipImage(image);
}

export function clipAesthetic(image: RawImage): Promise<string[]> {
  return inferClipAesthetic(image, [...AESTHETIC_LABELS]);
}
