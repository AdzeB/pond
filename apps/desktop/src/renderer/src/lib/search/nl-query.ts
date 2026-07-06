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

// Stage A of the "find anything" compiler: a deterministic natural-language ->
// structured-query resolver. It strips filler words and maps the rest onto the
// existing filter fields using only values that actually exist (live facets,
// known sources/types, curated presets), so it can never invent a facet. It
// runs instantly, offline, with no model, and is the floor every other stage
// falls back to. The vocabulary tables live in nl-vocabulary; the phrase
// matchers live in nl-matchers; this module is the orchestration + public API.

export interface NlFacets {
  // Distinct values present in the library, lowercased. Drive open-vocabulary
  // matching (tags/creators) and ground source matching to real data.
  sources: string[];
  tags: string[];
  types: string[];
  creators: string[];
}

// An explicit ordering pulled from phrasing like "newest" / "longest videos".
export interface AskSort {
  key: "savedAt" | "duration" | "fileCount";
  dir: "asc" | "desc";
}

interface NlResult {
  query: Query;
  // Words that didn't resolve to a predicate, for free-text / semantic ranking.
  residual: string;
  // Explicit ordering / cap pulled from the phrasing, when present.
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

// Resolve a natural-language string into a structured query plus residual text,
// using only deterministic lookups grounded in the supplied live facets.
export function compileStageA(input: string, facets: NlFacets): NlResult {
  // Dates are pulled out first by chrono (+ the curated rolling-window table),
  // leaving the token walker a date-free string to reason about.
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

    // Ordering / cap phrasing ("newest", "top 10"). Last write wins.
    const order = matchSortLimit(words, i);
    if (order) {
      if (order.sort) sort = order.sort;
      if (order.limit != null) limit = order.limit;
      i += order.len;
      negateNext = false;
      continue;
    }

    // Duration before count so "more than 5 minutes" is a length, not a tally.
    const dur = matchDurationIntent(words, i);
    if (dur) {
      intentPreds.push(dur.pred);
      i += dur.len;
      negateNext = false;
      continue;
    }

    // Count intents run before the negator so "no more than 3" isn't eaten.
    const count = matchCountIntent(words, i);
    if (count) {
      intentPreds.push(count.pred);
      i += count.len;
      negateNext = false;
      continue;
    }

    // Presence intents own their negation ("no caption"), so they precede the
    // generic negator that would otherwise consume "no" / "without".
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

    // Greedy longest-phrase match against candidates.
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

// Flatten a (possibly nested) query into its predicates, for chip display.
export function flattenPredicates(clause: Clause): Predicate[] {
  if ("rules" in clause) return clause.rules.flatMap(flattenPredicates);
  return [clause];
}
