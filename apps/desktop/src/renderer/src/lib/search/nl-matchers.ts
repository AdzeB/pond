import { MEDIA_TYPES, SOURCES } from "@pond/schema/db";
import { COLOR_PRESETS } from "@pond/schema/filters/color";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { predicateIsActive } from "@/lib/search/filter-helpers";
import type { AskSort, NlFacets } from "@/lib/search/nl-query";
import {
  COMBINED_DURATION_RE,
  COUNT_PHRASES,
  DURATION_PHRASES,
  DURATION_UNITS,
  MULTI_WORDS,
  NUMBER_WORDS,
  SORT_WORDS,
  SORTED_DATE_PHRASES,
  SOURCE_SYNONYMS,
  TYPE_SYNONYMS,
  WITH_WORDS,
  WITHOUT_WORDS,
} from "@/lib/search/nl-vocabulary";

// The phrase-matching half of the Stage A compiler: turns a window of words into
// predicates / sort directives using the vocabulary tables. Pure and stateless;
// `compileStageA` in nl-query drives these in order.

export interface Candidate {
  // Lowercased phrase to match, longest-first.
  phrase: string;
  field: Predicate["field"];
  // Resolved value to accumulate for that field.
  value: string;
}

export function buildCandidates(facets: NlFacets): Candidate[] {
  const out: Candidate[] = [];
  const push = (phrase: string, field: Predicate["field"], value: string) => {
    const p = phrase.trim().toLowerCase();
    if (p) out.push({ phrase: p, field, value });
  };

  for (const [word, type] of Object.entries(TYPE_SYNONYMS)) {
    if ((MEDIA_TYPES as readonly string[]).includes(type)) {
      push(word, "type", type);
    }
  }

  for (const [word, source] of Object.entries(SOURCE_SYNONYMS)) {
    if ((SOURCES as readonly string[]).includes(source)) {
      push(word, "source", source);
    }
  }
  // Live sources by their literal id, in case of unmapped/new sources.
  for (const source of facets.sources) push(source, "source", source);

  for (const color of COLOR_PRESETS) {
    push(color.label, "color", color.hex.toLowerCase());
  }

  // Open vocabulary: only values that exist in the library.
  for (const tag of facets.tags) push(tag, "tags", tag);
  for (const creator of facets.creators) push(creator, "creator", creator);

  // Longest phrase first so "are.na" beats "arena", "past 3 months" beats "month".
  out.sort(
    (a, b) => b.phrase.split(/\s+/).length - a.phrase.split(/\s+/).length,
  );
  return out;
}

export interface Accumulator {
  sources: Set<string>;
  types: Set<string>;
  tags: Set<string>;
  creators: Set<string>;
  colors: string[];
  // Negated counterparts.
  negSources: Set<string>;
  negTypes: Set<string>;
  negTags: Set<string>;
  negCreators: Set<string>;
}

export function newAccumulator(): Accumulator {
  return {
    sources: new Set(),
    types: new Set(),
    tags: new Set(),
    creators: new Set(),
    colors: [],
    negSources: new Set(),
    negTypes: new Set(),
    negCreators: new Set(),
    negTags: new Set(),
  };
}

export function accumulate(
  acc: Accumulator,
  c: Candidate,
  negate: boolean,
): void {
  switch (c.field) {
    case "source":
      (negate ? acc.negSources : acc.sources).add(c.value);
      return;
    case "type":
      (negate ? acc.negTypes : acc.types).add(c.value);
      return;
    case "tags":
      (negate ? acc.negTags : acc.tags).add(c.value);
      return;
    case "creator":
      (negate ? acc.negCreators : acc.creators).add(c.value);
      return;
    case "color":
      acc.colors.push(c.value);
      return;
    default:
      return;
  }
}

// Merge an accumulator into predicates: enum sets collapse to eq/in (+ neq/nin),
// tags to some/none, creators to eq/in, colors/dates to one predicate each.
export function toPredicates(acc: Accumulator): Predicate[] {
  const out: Predicate[] = [];

  const enumPred = (
    field: "source" | "type",
    values: Set<string>,
    negate: boolean,
  ) => {
    const list = [...values];
    if (list.length === 0) return;
    if (list.length === 1) {
      out.push({ field, operator: negate ? "neq" : "eq", value: list[0] });
    } else {
      out.push({ field, operator: negate ? "nin" : "in", value: list });
    }
  };
  enumPred("source", acc.sources, false);
  enumPred("source", acc.negSources, true);
  enumPred("type", acc.types, false);
  enumPred("type", acc.negTypes, true);

  if (acc.creators.size > 0) {
    const list = [...acc.creators];
    out.push(
      list.length === 1
        ? { field: "creator", operator: "eq", value: list[0] }
        : { field: "creator", operator: "in", value: list },
    );
  }
  if (acc.negCreators.size > 0) {
    const list = [...acc.negCreators];
    out.push(
      list.length === 1
        ? { field: "creator", operator: "neq", value: list[0] }
        : { field: "creator", operator: "nin", value: list },
    );
  }

  if (acc.tags.size > 0) {
    out.push({ field: "tags", operator: "some", value: [...acc.tags] });
  }
  if (acc.negTags.size > 0) {
    out.push({ field: "tags", operator: "none", value: [...acc.negTags] });
  }

  for (const hex of acc.colors) {
    out.push({ field: "color", operator: "near", value: hex });
  }

  return out.filter(predicateIsActive);
}

function parseCount(word: string): number | null {
  if (word in NUMBER_WORDS) return NUMBER_WORDS[word] ?? null;
  if (/^\d+$/.test(word)) {
    const n = Number.parseInt(word, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Spoken quantities for durations ("an hour", "a minute").
function parseQuantity(word: string): number | null {
  if (word === "a" || word === "an") return 1;
  return parseCount(word);
}

// Read a duration value starting at i, as either one glued token ("30s") or a
// number + unit pair ("5 minutes", "an hour"). Returns seconds + tokens used.
function parseDurationAt(
  words: string[],
  i: number,
): { seconds: number; len: number } | null {
  const w0 = (words[i] ?? "").toLowerCase();
  const glued = COMBINED_DURATION_RE.exec(w0);
  if (glued) {
    const n = Number.parseFloat(glued[1] ?? "");
    const unit = DURATION_UNITS[glued[2] ?? ""];
    if (Number.isFinite(n) && unit) {
      return { seconds: Math.round(n * unit), len: 1 };
    }
  }
  const n = parseQuantity(w0);
  if (n !== null) {
    const unit = DURATION_UNITS[(words[i + 1] ?? "").toLowerCase()];
    if (unit) return { seconds: Math.round(n * unit), len: 2 };
  }
  return null;
}

// Duration intents over a video/audio's length: "short videos", "longer than 5
// minutes", "under 2 min", "over an hour", "at least 30s". Runs before the file
// count intent so "more than 5 minutes" reads as a duration, not a file count.
export function matchDurationIntent(
  words: string[],
  i: number,
): { pred: Predicate; len: number } | null {
  const at = (k: number) => words[i + k] ?? "";

  if (at(0) === "short" || at(0) === "brief") {
    return { pred: { field: "duration", operator: "lte", value: 60 }, len: 1 };
  }
  if (at(0) === "long" || at(0) === "lengthy") {
    return { pred: { field: "duration", operator: "gte", value: 600 }, len: 1 };
  }

  for (const [phrase, operator] of DURATION_PHRASES) {
    if (phrase.every((part, k) => at(k) === part)) {
      const dur = parseDurationAt(words, i + phrase.length);
      if (dur) {
        return {
          pred: { field: "duration", operator, value: dur.seconds },
          len: phrase.length + dur.len,
        };
      }
    }
  }
  return null;
}

// Count intents over the number of attached files, e.g. "more than one image",
// "at least 3 photos", "multiple images". The trailing media noun (if any) is
// left for the type matcher, so "more than one image" also constrains type.
export function matchCountIntent(
  words: string[],
  i: number,
): { pred: Predicate; len: number } | null {
  const at = (k: number) => words[i + k] ?? "";

  if (MULTI_WORDS.has(at(0))) {
    return {
      pred: { field: "fileCount", operator: "gt", value: 1 },
      len: 1,
    };
  }

  for (const [phrase, operator] of COUNT_PHRASES) {
    if (phrase.every((part, k) => at(k) === part)) {
      const n = parseCount(at(phrase.length));
      if (n !== null) {
        return {
          pred: { field: "fileCount", operator, value: n },
          len: phrase.length + 1,
        };
      }
    }
  }
  return null;
}

// A relative window ("last week") or an absolute year ("2024") starting at i.
function matchDateValue(
  words: string[],
  i: number,
):
  | { kind: "window"; iso: string; len: number }
  | { kind: "year"; year: number; len: number }
  | null {
  const w = (words[i] ?? "").toLowerCase();
  if (/^(19|20)\d{2}$/.test(w)) {
    return { kind: "year", year: Number.parseInt(w, 10), len: 1 };
  }
  for (const [phrase, iso] of SORTED_DATE_PHRASES) {
    const parts = phrase.split(/\s+/);
    if (parts.every((part, k) => (words[i + k] ?? "") === part)) {
      return { kind: "window", iso, len: parts.length };
    }
  }
  return null;
}

const yearStart = (y: number) => `${y}-01-01`;

// Date intents with direction: "before last week", "after 2023", "since last
// month", "older than a year", or a bare phrase ("this week" -> on or after).
// `field` is the qualifier-resolved target (savedAt / publishedAt / modifiedAt).
export function matchDateIntent(
  words: string[],
  i: number,
  field: FieldId,
): { pred: Predicate; len: number } | null {
  const at = (k: number) => (words[i + k] ?? "").toLowerCase();

  // Optional direction word(s) before the date value.
  let k = 0;
  let dir: "before" | "after" | "since" | null = null;
  const head = at(0);
  if (head === "before" || head === "older" || head === "earlier") {
    dir = "before";
    k = 1;
  } else if (head === "after" || head === "newer") {
    dir = "after";
    k = 1;
  } else if (head === "since") {
    dir = "since";
    k = 1;
  }
  if (dir && (at(k) === "than" || at(k) === "to")) k += 1;

  const value = matchDateValue(words, i + k);
  if (!value) return null;
  const len = k + value.len;

  let predicate: Predicate;
  if (value.kind === "year") {
    if (dir === "before") {
      predicate = { field, operator: "lt", value: yearStart(value.year) };
    } else if (dir === "after") {
      predicate = { field, operator: "gte", value: yearStart(value.year + 1) };
    } else if (dir === "since") {
      predicate = { field, operator: "gte", value: yearStart(value.year) };
    } else {
      predicate = {
        field,
        operator: "between",
        value: [yearStart(value.year), yearStart(value.year + 1)],
      };
    }
  } else {
    // A relative window: default "on or after"; "before" flips to strictly older.
    const operator = dir === "before" ? "lt" : dir === "after" ? "gt" : "gte";
    predicate = { field, operator, value: value.iso };
  }
  return { pred: predicate, len };
}

// Recognize ordering / cap phrasing: "newest", "most recent", "top 10",
// "first 5", "10 newest". Returns a partial directive plus tokens consumed.
export function matchSortLimit(
  words: string[],
  i: number,
): { sort?: AskSort; limit?: number; len: number } | null {
  const at = (k: number) => (words[i + k] ?? "").toLowerCase();

  // "most recent" -> newest.
  if (at(0) === "most" && at(1) === "recent") {
    return { sort: { key: "savedAt", dir: "desc" }, len: 2 };
  }

  const sort = SORT_WORDS[at(0)];
  if (sort) return { sort, len: 1 };

  // "top 10" / "first 5".
  if (at(0) === "top" || at(0) === "first") {
    const n = parseCount(at(1));
    if (n !== null && n > 0) return { limit: n, len: 2 };
  }

  // "10 newest" / "5 most recent" -> just the cap; the sort word matches next.
  const lead = parseCount(at(0));
  if (lead !== null && lead > 0) {
    if (SORT_WORDS[at(1)] || (at(1) === "most" && at(2) === "recent")) {
      return { limit: lead, len: 1 };
    }
  }
  return null;
}

// Nouns that map to an "optional" (exists) field.
function optionalFieldForNoun(noun: string): FieldId | null {
  if (/^notes?$/.test(noun)) return "note";
  if (/^captions?$/.test(noun)) return "caption";
  if (/^(transcripts?|subtitles?)$/.test(noun)) return "transcript";
  return null;
}

// Presence intents that aren't simple value matches: "with a note", "no
// caption", "untagged", "with subtitles". Handles its own negation, so it must
// run before the generic negator step (which would otherwise eat "no"/"without").
export function matchIntent(
  words: string[],
  i: number,
): { pred: Predicate; len: number } | null {
  const at = (k: number) => words[i + k] ?? "";

  // Single-word adjectives.
  switch (at(0)) {
    case "untagged":
      return {
        pred: { field: "tags", operator: "empty", value: true },
        len: 1,
      };
    case "tagged":
      return {
        pred: { field: "tags", operator: "empty", value: true, negate: true },
        len: 1,
      };
    case "captioned":
      return {
        pred: { field: "caption", operator: "exists", value: true },
        len: 1,
      };
    case "transcribed":
      return {
        pred: { field: "transcript", operator: "exists", value: true },
        len: 1,
      };
  }

  const head = at(0);
  if (!WITH_WORDS.has(head) && !WITHOUT_WORDS.has(head)) return null;
  const negated = WITHOUT_WORDS.has(head);

  // Skip an optional article: "with a note", "without any captions".
  let k = 1;
  if (at(k) === "a" || at(k) === "an" || at(k) === "any") k += 1;
  const noun = at(k);

  if (/^tags?$/.test(noun)) {
    // "with tags" -> not empty; "without tags" -> empty.
    return {
      pred: {
        field: "tags",
        operator: "empty",
        value: true,
        ...(negated ? {} : { negate: true }),
      },
      len: k + 1,
    };
  }

  const field = optionalFieldForNoun(noun);
  if (field) {
    return {
      pred: { field, operator: "exists", value: !negated },
      len: k + 1,
    };
  }
  return null;
}

export function matchCandidate(
  words: string[],
  i: number,
  candidates: Candidate[],
): { candidate: Candidate; len: number } | null {
  for (const candidate of candidates) {
    const parts = candidate.phrase.split(/\s+/);
    if (parts.every((part, k) => words[i + k] === part)) {
      return { candidate, len: parts.length };
    }
  }
  return null;
}
