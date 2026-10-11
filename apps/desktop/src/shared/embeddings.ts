import { EMBEDDING_MODEL } from "./on-device-models";

const EMBEDDING_DIMENSIONS = 768 as const;

const TEXT_PREPROCESSING_VERSION = 4;
const MEDIA_PREPROCESSING_VERSION = 4;
const MEDIA_PREPROCESSING =
  "image-v1+audio-mono16k-30s+video-1fps-32f-32s+normalized-mean-v1";

function embeddingVersion(
  task: "document" | "media",
  preprocessingVersion: number,
): string {
  return `${EMBEDDING_MODEL.id}@${EMBEDDING_MODEL.revision}:${task}:${EMBEDDING_DIMENSIONS}:${preprocessingVersion}`;
}

export function embeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}

export function textEmbeddingVersion(): string {
  return embeddingVersion("document", TEXT_PREPROCESSING_VERSION);
}

export function mediaEmbeddingVersion(): string {
  return `${embeddingVersion("media", MEDIA_PREPROCESSING_VERSION)}:${MEDIA_PREPROCESSING}`;
}

export function clipEmbeddingVersion(): string {
  return mediaEmbeddingVersion();
}

function cleanEmbeddingText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function embeddingSearchQuery(text: string): string {
  return `task: search result | query: ${cleanEmbeddingText(text)}`;
}

export function embeddingDocument(title: string | null, text: string): string {
  const cleanTitle = cleanEmbeddingText(title ?? "") || "none";
  return `title: ${cleanTitle} | text: ${cleanEmbeddingText(text)}`;
}

export function embeddingClassificationLabel(text: string): string {
  return `task: classification | query: ${cleanEmbeddingText(text)}`;
}

export function embeddingSimilarityText(text: string): string {
  return `task: sentence similarity | query: ${cleanEmbeddingText(text)}`;
}

export function embeddingCodeQuery(text: string): string {
  return `task: code retrieval | query: ${cleanEmbeddingText(text)}`;
}

export function embeddingFactClaim(text: string): string {
  return `task: fact checking | query: ${cleanEmbeddingText(text)}`;
}

export function embeddingClusterText(text: string): string {
  return `task: clustering | query: ${cleanEmbeddingText(text)}`;
}

export function normalizedEmbeddingVector(vector: ArrayLike<number>): number[] {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `[embedding-gemma] expected ${EMBEDDING_DIMENSIONS} dimensions, received ${vector.length}`,
    );
  }

  let magnitude = 0;
  const values = Array.from(vector, (value) => {
    if (!Number.isFinite(value)) {
      throw new Error(
        "[embedding-gemma] embedding contains a non-finite value",
      );
    }
    magnitude += value * value;
    return value;
  });
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    throw new Error("[embedding-gemma] embedding has zero magnitude");
  }

  const divisor = Math.sqrt(magnitude);
  return values.map((value) => value / divisor);
}
