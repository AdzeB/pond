import { useEffect, useState } from "react";
import { ensureSaves } from "@/lib/save/ensure-saves";
import { searchFtsScores } from "@/lib/search/fts-client";
import type { Save } from "@/lib/types";
import { pool } from "@/stores/pool";
import { useSaves } from "./use-saves";

const MAX_RESULTS = 500;
const DEBOUNCE_MS = 100;

/** Ranks by SQLite FTS5 (same index Ask keyword ranking uses). */
export function useSearchResults(
  query: string,
  opts?: { deletedOnly?: boolean },
): {
  results: Save[] | null;
  searching: boolean;
} {
  const _saves = useSaves();
  const deletedOnly = opts?.deletedOnly ?? false;
  const [results, setResults] = useState<Save[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const scores = await searchFtsScores(trimmed, "all", { deletedOnly });
        if (cancelled) return;
        if (scores.size === 0) {
          setResults([]);
          setSearching(false);
          return;
        }
        await ensureSaves([...scores.keys()]);
        if (cancelled) return;
        const scored: Array<{ save: Save; score: number }> = [];
        for (const [id, score] of scores) {
          const save = pool.get(id);
          if (!save) continue;
          if (deletedOnly ? !save.deletedAt : save.deletedAt) continue;
          scored.push({ save, score });
        }
        scored.sort((a, b) => b.score - a.score);
        setResults(scored.slice(0, MAX_RESULTS).map((row) => row.save));
        setSearching(false);
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, deletedOnly]);

  return { results, searching };
}
