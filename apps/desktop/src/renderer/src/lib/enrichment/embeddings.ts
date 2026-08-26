import {
  inferEmbedText,
  inferEmbedTexts,
} from "@/lib/enrichment/inference-client";
import { getPrefsSnapshot } from "@/stores/prefs";

const DEFAULT_MODEL_ID = "Xenova/all-MiniLM-L6-v2";

function embedModelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.embedModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

export function embedModelVersion(): string {
  return `${embedModelId()}@2`;
}

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
