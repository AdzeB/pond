import { embedModelVersion, embedTexts } from "@/lib/enrichment/embeddings";
import type { Save } from "@/lib/types";
import { dot } from "@/lib/util/vector";
import { embeddingStore } from "@/stores/embedding-store";
import type { Enricher } from "../types";

const SUGGESTED_TAGS_VERSION = "suggested-tags@1";
const SCORE_THRESHOLD = 0.3;
const MAX_SUGGESTIONS = 5;

interface VocabEntry {
  name: string;
  vec: Float32Array;
}

// Tag-vocabulary embeddings, cached per embed-model version so we embed the
// vocabulary at most once per session.
let vocabPromise: Promise<VocabEntry[]> | null = null;
let vocabKey = "";

async function getVocab(): Promise<VocabEntry[]> {
  const key = embedModelVersion();
  if (vocabPromise && vocabKey === key) return vocabPromise;
  vocabKey = key;
  vocabPromise = (async () => {
    const rows = (await window.pond.query("tags.list", {})) as Array<{
      name?: string;
    }>;
    const names = rows
      .map((r) => r.name)
      .filter((n): n is string => !!n && n.trim().length > 0);
    if (names.length === 0) return [];
    const vecs = await embedTexts(names);
    return names.map((name, i) => ({ name, vec: vecs[i] as Float32Array }));
  })();
  vocabPromise.catch(() => {
    vocabPromise = null;
  });
  return vocabPromise;
}

// Grounded tag suggestions: cosine-match the save's text embedding against the
// existing tag vocabulary. Non-destructive — stored in `suggestedTags` for the
// detail view to confirm, never applied automatically.
export const suggestedTagsEnricher: Enricher = {
  id: "suggestedTags",
  dependsOn: ["textEmbedding"],
  enabled: (prefs) =>
    prefs?.ai?.enableSuggestedTags === true &&
    prefs?.ai?.semanticSearch === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (save.suggestedTagsModel === SUGGESTED_TAGS_VERSION) return false;
    const entry = embeddingStore.state.byId.get(save.id);
    return !!entry && entry.model === embedModelVersion();
  },
  async run(save: Save) {
    const entry = embeddingStore.state.byId.get(save.id);
    if (!entry) return null;
    const vocab = await getVocab();
    const existing = new Set((save.tags ?? []).map((t) => t.toLowerCase()));
    const scored = vocab
      .filter((v) => !existing.has(v.name.toLowerCase()))
      .map((v) => ({ name: v.name, score: dot(entry.vec, v.vec) }))
      .filter((s) => s.score >= SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS)
      .map((s) => s.name);
    const fields = {
      suggestedTags: scored,
      suggestedTagsModel: SUGGESTED_TAGS_VERSION,
    };
    return { derived: fields, optimistic: fields };
  },
};
