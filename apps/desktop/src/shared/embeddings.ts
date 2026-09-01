export const DEFAULT_TEXT_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const DEFAULT_CLIP_MODEL = "Xenova/clip-vit-base-patch32";

export function textEmbeddingVersion(modelId: string): string {
  return `${modelId}@2`;
}

export function clipEmbeddingVersion(modelId: string): string {
  return `${modelId}@1`;
}
