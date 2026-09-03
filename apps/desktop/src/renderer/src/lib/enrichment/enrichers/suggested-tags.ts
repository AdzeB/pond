import { z } from "zod";
import { embedModelVersion, embedTexts } from "@/lib/enrichment/embeddings";
import type { Save } from "@/lib/types";
import { dot } from "@/lib/util/vector";
import { embeddingFor } from "@/stores/embedding-store";
import type { Enricher } from "../types";

const SUGGESTED_TAGS_VERSION = "suggested-tags@1";
const SCORE_THRESHOLD = 0.3;
const MAX_SUGGESTIONS = 5;

interface VocabEntry {
  name: string;
  vec: Float32Array;
}

const TagRowsSchema = z.array(
  z.object({ name: z.string().optional().catch(undefined) }),
);

let vocabPromise: Promise<VocabEntry[]> | null = null;
let vocabKey = "";

async function getVocab(): Promise<VocabEntry[]> {
  const key = embedModelVersion();
  if (vocabPromise && vocabKey === key) return vocabPromise;
  vocabKey = key;
  vocabPromise = (async () => {
    const rows = TagRowsSchema.parse(await window.pond.query("tags.list", {}));
    const names = rows
      .map((r) => r.name)
      .filter((n): n is string => !!n && n.trim().length > 0);
    if (names.length === 0) return [];
    const vecs = await embedTexts(names);
    return names.flatMap((name, i) => {
      const vec = vecs[i];
      return vec ? [{ name, vec }] : [];
    });
  })();
  vocabPromise.catch(() => {
    vocabPromise = null;
  });
  return vocabPromise;
}

export const suggestedTagsEnricher: Enricher = {
  id: "suggestedTags",
  dependsOn: ["textEmbedding"],
  enabled: (prefs) =>
    prefs?.ai?.enableSuggestedTags === true &&
    prefs?.ai?.semanticSearch === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (save.suggestedTagsModel === SUGGESTED_TAGS_VERSION) return false;
    return save.embeddingModel === embedModelVersion();
  },
  async run(save: Save) {
    const entry = await embeddingFor(save.id);
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
