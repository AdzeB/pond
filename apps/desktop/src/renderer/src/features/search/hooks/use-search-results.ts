import { useEffect, useState } from "react";
import { ensureSaves, pool, useSaves } from "@/features/saves/pool";
import type { Save } from "@/features/saves/types";
import { searchFtsScores } from "@/features/search/lib/fts-client";
import { retrieveSaveIds } from "@/features/search/lib/retrieve-client";

const MAX_RESULTS = 500;
const DEBOUNCE_MS = 100;

let lastHits: {
  query: string;
  deletedOnly: boolean;
  retrieve: boolean;
  ids: string[];
} | null = null;

function resolveHits(
  query: string,
  deletedOnly: boolean,
  retrieve: boolean,
): Save[] | null {
  const trimmed = query.trim();
  if (!trimmed || !lastHits) return null;
  if (
    lastHits.query !== trimmed ||
    lastHits.deletedOnly !== deletedOnly ||
    lastHits.retrieve !== retrieve
  ) {
    return null;
  }
  const out: Save[] = [];
  for (const id of lastHits.ids) {
    const save = pool.get(id);
    if (!save) continue;
    if (deletedOnly ? !save.deletedAt : save.deletedAt) continue;
    out.push(save);
  }
  return out;
}

function commitHits(
  query: string,
  deletedOnly: boolean,
  retrieve: boolean,
  saves: Save[],
): void {
  lastHits = {
    query,
    deletedOnly,
    retrieve,
    ids: saves.map((s) => s.id),
  };
}

interface SearchResults {
  results: Save[] | null;
  searching: boolean;
}

export function useSearchResults(
  query: string,
  opts?: { deletedOnly?: boolean; retrieve?: boolean },
): SearchResults {
  const _saves = useSaves();
  const deletedOnly = opts?.deletedOnly ?? false;
  const retrieve = opts?.retrieve ?? false;
  const [results, setResults] = useState<Save[] | null>(() =>
    resolveHits(query, deletedOnly, retrieve),
  );
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      lastHits = null;
      setResults(null);
      setSearching(false);
      return;
    }
    const cached = resolveHits(trimmed, deletedOnly, retrieve);
    if (cached) setResults(cached);
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const ids = retrieve
            ? await retrieveSaveIds({ query: trimmed, limit: MAX_RESULTS })
            : [
                ...(
                  await searchFtsScores(trimmed, "all", {
                    deletedOnly,
                    limit: MAX_RESULTS,
                  })
                ).keys(),
              ];
          if (cancelled) return;
          if (ids.length === 0) {
            commitHits(trimmed, deletedOnly, retrieve, []);
            setResults([]);
            return;
          }
          await ensureSaves(ids);
          if (cancelled) return;
          const next: Save[] = [];
          for (const id of ids) {
            const save = pool.get(id);
            if (!save) continue;
            if (deletedOnly ? !save.deletedAt : save.deletedAt) continue;
            next.push(save);
            if (next.length >= MAX_RESULTS) break;
          }
          commitHits(trimmed, deletedOnly, retrieve, next);
          setResults(next);
        } catch (error) {
          if (!cancelled)
            console.warn("[pond search] keyword search failed", error);
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, deletedOnly, retrieve]);

  return { results, searching };
}
