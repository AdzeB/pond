import uFuzzy from "@leeoniya/ufuzzy";

// Shared fuzzy ranker for small in-memory pickers (skills, tasks, command
// palettes). uFuzzy is tiny, index-free, and tuned for matching a short needle
// against a list of short phrases — exactly the picker use case.
//
// SingleError mode tolerates one typo (substitution / transposition / insertion
// / deletion) per term while keeping the first char anchored, so "vido" still
// finds "video" but noise stays out.
const uf = new uFuzzy({
  intraMode: 1,
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
});

// Rank `items` by fuzzy relevance of `query` over the string each item exposes
// via `toHaystack`. An empty query returns the items untouched (caller's stored
// order); no matches returns an empty list.
export function fuzzyRank<T>(
  items: readonly T[],
  query: string,
  toHaystack: (item: T) => string,
): T[] {
  const q = query.trim();
  if (!q) return [...items];

  const haystack = items.map(toHaystack);
  const idxs = uf.filter(haystack, q);
  if (idxs == null || idxs.length === 0) return [];

  const info = uf.info(idxs, haystack, q);
  const order = uf.sort(info, haystack, q);
  return order.map((o) => items[info.idx[o] as number] as T);
}
