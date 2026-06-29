import {
  inferEmbedText,
  inferEmbedTexts,
} from "@/lib/enrichment/inference-client";
import { getPrefsSnapshot } from "@/stores/prefs";

// On-device text embeddings for semantic search and fuzzy facet resolution.
// Model loading + execution lives in the inference worker (inference-core); this
// module resolves the prefs-driven model id, the persisted stamp, and the pure
// vector helpers (cosine, embedding text) used at query time.

const DEFAULT_MODEL_ID = "Xenova/all-MiniLM-L6-v2";

export function embedModelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.embedModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

// Version stamp persisted alongside each embedding; changing the model
// invalidates stored vectors so the sweep re-embeds.
// @2 re-embeds once caption/OCR/transcript text can be folded into the vector.
export function embedModelVersion(): string {
  return `${embedModelId()}@2`;
}

// Embed one string into a normalized vector. Mean-pooled + normalized so cosine
// similarity is a plain dot product.
export function embedText(text: string): Promise<Float32Array> {
  return inferEmbedText(text, embedModelId());
}

export function embedTexts(texts: string[]): Promise<Float32Array[]> {
  return inferEmbedTexts(texts, embedModelId());
}

// The text we embed for a save: its human-meaningful fields concatenated.
export function saveEmbeddingText(save: {
  title: string | null;
  description: string | null;
  notes: string | null;
  author: string | null;
  tags: string[];
}): string {
  return [
    save.title ?? "",
    save.description ?? "",
    save.notes ?? "",
    save.author ?? "",
    (save.tags ?? []).join(" "),
  ]
    .filter((s) => s.trim().length > 0)
    .join(" \u2014 ")
    .slice(0, 2000);
}
