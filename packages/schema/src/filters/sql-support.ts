import type { Clause, Query } from "./types";
import { isGroup, isPredicate } from "./types";

/** Color near-match has no SQL projection; callers post-filter those predicates in memory. */
export function queryHasColorPredicate(
  query: Query | null | undefined,
): boolean {
  if (!query) return false;
  return clauseHasColor(query);
}

function clauseHasColor(c: Clause): boolean {
  if (isGroup(c)) return c.rules.some(clauseHasColor);
  if (isPredicate(c)) return c.field === "color";
  return false;
}
