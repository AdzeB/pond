import {
  embedModelVersion,
  embedText,
  saveEmbeddingText,
} from "@/lib/enrichment/embeddings";
import type { Save } from "@/lib/types";
import {
  embeddingStore,
  loadEmbeddings,
  setEmbedding,
} from "@/stores/embedding-store";
import { getPrefsSnapshot } from "@/stores/prefs";
import type { Enricher } from "../types";

/** Folds enriched visual/audio text (caption, OCR, transcript) into the embedding so semantic search reaches inside media. */
function embeddingTextFor(save: Save): string {
  const base = saveEmbeddingText(save);
  const extra = [save.caption, save.ocrText, save.transcript]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(" \u2014 ");
  return [base, extra].filter((s) => s.trim().length > 0).join(" \u2014 ");
}

/** Depends on caption/ocr/transcript so the vector includes visual/audio text once those enrichers have stamped the save. */
export const textEmbeddingEnricher: Enricher = {
  id: "textEmbedding",
  dependsOn: ["caption", "ocr", "transcript"],
  hydrate: loadEmbeddings,
  enabled: () => getPrefsSnapshot()?.ai?.semanticSearch === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!embeddingTextFor(save)) return false;
    const entry = embeddingStore.state.byId.get(save.id);
    return !entry || entry.model !== embedModelVersion();
  },
  async run(save: Save) {
    const text = embeddingTextFor(save);
    if (!text) return null;
    const vec = await embedText(text);
    /** Self-persists into the embedding store + DB (non-synced), so no derived fields are returned. */
    setEmbedding(save.id, vec, embedModelVersion());
    return {};
  },
};
