import {
  inferEmbedText,
  inferEmbedTexts,
} from "@/lib/enrichment/inference-client";
import { getPrefsSnapshot } from "@/stores/prefs";

/** Model loading + execution live in the inference worker (inference-core); this module resolves the prefs-driven embedding model id, the persisted stamp, and the query-time helpers. */

const DEFAULT_MODEL_ID = "Xenova/all-MiniLM-L6-v2";

function embedModelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.embedModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

/** Version stamp persisted alongside each embedding; changing it invalidates stored vectors so the sweep re-embeds. */
export function embedModelVersion(): string {
  return `${embedModelId()}@2`;
}

/** Mean-pooled and normalized so cosine similarity is a plain dot product. */
export function embedText(text: string): Promise<Float32Array> {
  return inferEmbedText(text, embedModelId());
}

export function embedTexts(texts: string[]): Promise<Float32Array[]> {
  return inferEmbedTexts(texts, embedModelId());
}

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
