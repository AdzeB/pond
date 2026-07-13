import type { Clause, Predicate, Query } from "@pond/schema/filters/types";
import { extractDates } from "@/lib/search/nl-chrono";
import {
  accumulate,
  buildCandidates,
  matchCandidate,
  matchCountIntent,
  matchDurationIntent,
  matchIntent,
  matchSortLimit,
  newAccumulator,
  toPredicates,
} from "@/lib/search/nl-matchers";
import { FILLER, NEGATORS } from "@/lib/search/nl-vocabulary";
import { serializePredicate } from "@/lib/search/syntax";

/**
 * Compiler Stage A: a deterministic natural-language -> structured-query resolver that only maps onto values that actually exist, so it can never invent a facet; it runs offline with no model and is the floor every other stage falls back to.
 * @remarks Vocabulary tables live in nl-vocabulary, phrase matchers in nl-matchers; this module is the orchestration and public API.
 */

export interface NlFacets {
  /** Distinct lowercased values present in the library; ground matching to real data. */
  sources: string[];
  tags: string[];
  types: string[];
  creators: string[];
}

/** An explicit ordering pulled from phrasing like "newest" / "longest videos". */
export interface AskSort {
  key: "savedAt" | "duration" | "fileCount";
  dir: "asc" | "desc";
}

interface NlResult {
  query: Query;
  /** Words that didn't resolve to a predicate, for free-text / semantic ranking. */
  residual: string;
  /** Explicit ordering / cap pulled from the phrasing, when present. */
  sort: AskSort | null;
  limit: number | null;
}

export const EMPTY_FACETS: NlFacets = {
  sources: [],
  tags: [],
  types: [],
  creators: [],
};

export function dedupePredicates(predicates: Predicate[]): Predicate[] {
  const seen = new Set<string>();
  const out: Predicate[] = [];
  for (const p of predicates) {
    const key = serializePredicate(p) ?? JSON.stringify(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export function compileStageA(input: string, facets: NlFacets): NlResult {
  /** Dates are pulled out first, leaving the token walker a date-free string to reason about. */
  const { predicates: datePreds, rest } = extractDates(input);

  const words = rest
    .toLowerCase()
    .replace(/[?!.,]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const candidates = buildCandidates(facets);
  const acc = newAccumulator();
  const intentPreds: Predicate[] = [];
  const residual: string[] = [];

  let i = 0;
  let negateNext = false;
  let sort: AskSort | null = null;
  let limit: number | null = null;
  while (i < words.length) {
    const word = words[i] as string;

    /** Ordering / cap phrasing; last write wins. */
    const order = matchSortLimit(words, i);
    if (order) {
      if (order.sort) sort = order.sort;
      if (order.limit != null) limit = order.limit;
      i += order.len;
      negateNext = false;
      continue;
    }

    /** Duration before count so "more than 5 minutes" is a length, not a tally. */
    const dur = matchDurationIntent(words, i);
    if (dur) {
      intentPreds.push(dur.pred);
      i += dur.len;
      negateNext = false;
      continue;
    }

    /** Count intents run before the negator so "no more than 3" isn't eaten. */
    const count = matchCountIntent(words, i);
    if (count) {
      intentPreds.push(count.pred);
      i += count.len;
      negateNext = false;
      continue;
    }

    /** Presence intents own their negation ("no caption"), so they precede the generic negator. */
    const intent = matchIntent(words, i);
    if (intent) {
      intentPreds.push(intent.pred);
      i += intent.len;
      negateNext = false;
      continue;
    }

    if (NEGATORS.has(word)) {
      negateNext = true;
      i += 1;
      continue;
    }

    const matched = matchCandidate(words, i, candidates);
    if (matched) {
      accumulate(acc, matched.candidate, negateNext);
      i += matched.len;
      negateNext = false;
      continue;
    }

    if (!FILLER.has(word)) residual.push(word);
    negateNext = false;
    i += 1;
  }

  const rules = dedupePredicates([
    ...toPredicates(acc),
    ...intentPreds,
    ...datePreds,
  ]);
  const query: Query = { combinator: "and", rules };
  return { query, residual: residual.join(" "), sort, limit };
}

/** Flattens a possibly nested query into its predicates, for chip display. */
export function flattenPredicates(clause: Clause): Predicate[] {
  if ("rules" in clause) return clause.rules.flatMap(flattenPredicates);
  return [clause];
}
