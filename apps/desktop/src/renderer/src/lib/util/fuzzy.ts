import uFuzzy from "@leeoniya/ufuzzy";

/**
 * Shared fuzzy ranker for small in-memory pickers; uFuzzy is tiny, index-free, and tuned for short-needle-vs-short-phrase matching.
 * @remarks SingleError mode tolerates one typo per term with the first char anchored, so "vido" finds "video" but noise stays out.
 */
const uf = new uFuzzy({
  intraMode: 1,
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
});

/** An empty query returns the items untouched in the caller's stored order; no matches returns an empty list. */
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
