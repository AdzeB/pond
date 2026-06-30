import { useMemo } from "react";
import { annNearest } from "@/lib/search/ann-index";
import type { Save } from "@/lib/types";
import { dot } from "@/lib/util/vector";
import { embeddingStore, useEmbeddingVersion } from "@/stores/embedding-store";
import { useSemanticQuery } from "@/stores/semantic-store";
import { useSearchText } from "@/stores/view-store";

// Upper bound on how many ANN neighbours to pull when reordering the grid; saves
// beyond this keep their incoming (recency) order, like unembedded ones do.
const ANN_RERANK_K = 1000;

// Hybrid ranking: when a "find anything" query produced a semantic vector for
// the current residual text, reorder the (already structurally-filtered) saves
// by cosine similarity to that vector. Saves without an embedding keep their
// original relative order, appended after the ranked ones. When no vector
// applies, the input list is returned unchanged.

export function useSemanticRank(
  saves: ReadonlyArray<Save>,
): ReadonlyArray<Save> {
  const { vector, text } = useSemanticQuery();
  const q = useSearchText();
  const version = useEmbeddingVersion();

  // `version` is an intentional trigger: the loop reads embeddingStore.state
  // (non-reactive) so we re-rank when new vectors land.
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is a re-rank trigger
  return useMemo(() => {
    // Only rank when the vector still corresponds to the active search text.
    if (!vector || text.trim() === "" || text !== q) return saves;

    // ANN path: pull the global nearest set and pull matching saves to the
    // front, preserving the rest's incoming order. Falls back to a linear cosine
    // sort when the index isn't ready.
    const ann = annNearest(vector, ANN_RERANK_K);
    if (ann) {
      const byId = new Map(saves.map((s) => [s.id, s]));
      const ranked: Save[] = [];
      const seen = new Set<string>();
      for (const { id } of ann) {
        const save = byId.get(id);
        if (save && !seen.has(id)) {
          ranked.push(save);
          seen.add(id);
        }
      }
      if (ranked.length === 0) return saves;
      const rest = saves.filter((s) => !seen.has(s.id));
      return [...ranked, ...rest];
    }

    const scored: { save: Save; score: number; index: number }[] = [];
    const unscored: { save: Save; index: number }[] = [];
    saves.forEach((save, index) => {
      const entry = embeddingStore.state.byId.get(save.id);
      if (entry) scored.push({ save, score: dot(vector, entry.vec), index });
      else unscored.push({ save, index });
    });

    if (scored.length === 0) return saves;

    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    return [...scored.map((s) => s.save), ...unscored.map((u) => u.save)];
    // version is a dependency so re-rank happens as new embeddings arrive.
  }, [saves, vector, text, q, version]);
}
