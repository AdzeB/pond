import {
  embedDocument,
  embedModelVersion,
  saveEmbeddingBody,
} from "@/features/enrichment/lib/embeddings";
import { setEmbedding } from "@/features/enrichment/state/embedding-store";
import type { Save } from "@/features/saves/types";
import { getPrefsSnapshot } from "@/shared/state/prefs";
import type { Enricher } from "../types";

function embeddingTextFor(save: Save): string {
  const base = saveEmbeddingBody(save);
  const extra = [save.caption, save.ocrText, save.transcript]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(" \u2014 ");
  return [base, extra].filter((s) => s.trim().length > 0).join(" \u2014 ");
}

export const textEmbeddingEnricher: Enricher = {
  id: "textEmbedding",
  dependsOn: ["caption", "ocr", "transcript"],
  enabled: () => getPrefsSnapshot()?.ai?.semanticSearch === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!save.title?.trim() && !embeddingTextFor(save)) return false;
    return save.embeddingModel !== embedModelVersion();
  },
  async run(save: Save) {
    const text = embeddingTextFor(save);
    if (!save.title?.trim() && !text) return null;
    const vec = await embedDocument(save.title, text);
    const model = embedModelVersion();
    setEmbedding(save.id, vec, model);
    return { optimistic: { embeddingModel: model } };
  },
};
