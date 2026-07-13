import { useMemo } from "react";
import { searchScores } from "@/lib/search/text-index";
import type { Save } from "@/lib/types";
import { useSaves } from "./use-saves";

/** Ranks by the shared Orama BM25 index (the same one the Ask agent's keyword ranker uses); "all"-term matching keeps every-word-must-hit behaviour. */
const MAX_RESULTS = 500;

export function useSearchResults(
  query: string,
  opts?: { deletedOnly?: boolean },
): {
  results: Save[] | null;
  searching: boolean;
} {
  const saves = useSaves();
  const deletedOnly = opts?.deletedOnly ?? false;
  const results = useMemo<Save[] | null>(() => {
    if (!query.trim()) return null;
    const scores = searchScores(query, "all");
    if (scores.size === 0) return [];

    const scored: Array<{ save: Save; score: number }> = [];
    for (const save of saves) {
      if (deletedOnly ? !save.deletedAt : save.deletedAt) continue;
      const score = scores.get(save.id);
      if (score != null) scored.push({ save, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS).map((row) => row.save);
  }, [saves, query, deletedOnly]);

  return { results, searching: false };
}
