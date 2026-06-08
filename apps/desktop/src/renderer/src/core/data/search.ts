import { useMemo } from "react";
import { useSaves } from "./hooks";
import type { Save } from "./types";

// Client-side scorer over the in-memory pool. Every term has to hit
// at least one field; title prefix beats title substring beats tag
// beats URL/author/description/notes.

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
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;
    const terms = trimmed.split(/\s+/).filter(Boolean);
    if (terms.length === 0) return null;

    const scored: Array<{ save: Save; score: number }> = [];
    for (const save of saves) {
      if (deletedOnly ? !save.deletedAt : save.deletedAt) continue;
      const s = scoreMatch(save, terms);
      if (s > 0) scored.push({ save, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS).map((row) => row.save);
  }, [saves, query, deletedOnly]);

  return { results, searching: false };
}

function scoreMatch(save: Save, terms: string[]): number {
  const title = (save.title ?? "").toLowerCase();
  const url = save.url.toLowerCase();
  const author = (save.author ?? "").toLowerCase();
  const tagBlob = save.tags.join(" ").toLowerCase();
  const description = (save.description ?? "").toLowerCase();
  const notes = (save.notes ?? "").toLowerCase();

  let total = 0;
  for (const term of terms) {
    let score = 0;
    if (title.startsWith(term)) score = Math.max(score, 1000);
    else if (title.includes(term)) score = Math.max(score, 500);
    if (tagBlob.includes(term)) score = Math.max(score, 300);
    if (url.includes(term)) score = Math.max(score, 200);
    if (author.includes(term)) score = Math.max(score, 150);
    if (description.includes(term)) score = Math.max(score, 100);
    if (notes.includes(term)) score = Math.max(score, 50);
    if (score === 0) return 0;
    total += score;
  }
  return total;
}
