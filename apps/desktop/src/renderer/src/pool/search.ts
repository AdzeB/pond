import { useMemo } from "react";
import { useSaves } from "./hooks";
import type { Save } from "./types";

// Client-side fuzzy search over the in-memory pool. Linear's argument
// for this pattern: every search hit a local store rather than the
// server, so results paint in the same frame the user finishes typing.
// Pond's `Save[]` is small enough (mid-thousands at most) that a
// substring scorer over the pool runs in <1ms even on a cold machine,
// and side-steps the IPC roundtrip + SQLite FTS planner the old
// `saves.search` query went through.
//
// We score per-term against each field and require every term to hit
// at least one field. Title prefix beats title substring beats URL/tag
// hits, so the most relevant save lands first even before cmdk's own
// fuzzy ranking re-orders the visible commands.

const MAX_RESULTS = 500;

export function useSearchResults(query: string): {
  results: Save[] | null;
  searching: boolean;
} {
  const saves = useSaves();
  const results = useMemo<Save[] | null>(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;
    const terms = trimmed.split(/\s+/).filter(Boolean);
    if (terms.length === 0) return null;

    const scored: Array<{ save: Save; score: number }> = [];
    for (const save of saves) {
      if (save.deletedAt) continue;
      const s = scoreMatch(save, terms);
      if (s > 0) scored.push({ save, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS).map((row) => row.save);
  }, [saves, query]);

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
    // Every term has to hit somewhere — otherwise "react native" would
    // match a save with only "react" in the title.
    if (score === 0) return 0;
    total += score;
  }
  return total;
}
