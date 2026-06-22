import { useMemo } from "react";
import { cosine } from "@/lib/embeddings";
import type { Save } from "@/lib/types";
import {
  clipEmbeddingStore,
  useClipEmbeddingVersion,
} from "@/stores/clip-embedding-store";
import { embeddingStore, useEmbeddingVersion } from "@/stores/embedding-store";
import { pool } from "@/stores/pool";

export interface RelatedSave {
  save: Save;
  score: number;
}

const DEFAULT_LIMIT = 12;
// Below this cosine the match is noise rather than a meaningful neighbour.
const MIN_SCORE = 0.2;

// Nearest neighbours to `id` by meaning. Blends the text-embedding score with
// the CLIP (visual) score when both vectors exist so the strip reflects what
// the save is about *and* what it looks like; falls back to whichever exists.
export function useRelatedSaves(
  id: string | null | undefined,
  limit = DEFAULT_LIMIT,
): RelatedSave[] {
  const textVersion = useEmbeddingVersion();
  const clipVersion = useClipEmbeddingVersion();

  // biome-ignore lint/correctness/useExhaustiveDependencies: versions are re-rank triggers as vectors land
  return useMemo(() => {
    if (!id) return [];
    const text = embeddingStore.state.byId.get(id)?.vec ?? null;
    const clip = clipEmbeddingStore.state.byId.get(id)?.vec ?? null;
    if (!text && !clip) return [];

    const scored: RelatedSave[] = [];
    for (const save of pool.snapshot()) {
      if (save.id === id || save.deletedAt) continue;
      const otherText = embeddingStore.state.byId.get(save.id)?.vec;
      const otherClip = clipEmbeddingStore.state.byId.get(save.id)?.vec;
      const parts: number[] = [];
      if (text && otherText) parts.push(cosine(text, otherText));
      if (clip && otherClip) parts.push(cosine(clip, otherClip));
      if (parts.length === 0) continue;
      const score = parts.reduce((a, b) => a + b, 0) / parts.length;
      if (score >= MIN_SCORE) scored.push({ save, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }, [id, limit, textVersion, clipVersion]);
}
