import { MEDIA_TYPES, SOURCES } from "@pond/schema/db";
import { COLOR_PRESETS } from "@pond/schema/filters/color";
import type {
  Clause,
  ComparatorId,
  FieldId,
  Predicate,
  Query,
} from "@pond/schema/filters/types";
import { predicateIsActive } from "./filter-helpers";
import { serializePredicate } from "./search-syntax";

// Stage A of the "find anything" compiler: a deterministic natural-language ->
// structured-query resolver. It strips filler words and maps the rest onto the
// existing filter fields using only values that actually exist (live facets,
// known sources/types, curated presets), so it can never invent a facet. It
// runs instantly, offline, with no model, and is the floor every other stage
// falls back to.

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

export interface NlResult {
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

// Conversational scaffolding that carries no filter intent.
const FILLER = new Set([
  "show",
  "me",
  "all",
  "my",
  "the",
  "a",
  "an",
  "find",
  "get",
  "give",
  "see",
  "view",
  "display",
  "list",
  "search",
  "of",
  "that",
  "i",
  "have",
  "having",
  "anything",
  "everything",
  "stuff",
  "things",
  "thing",
  "items",
  "item",
  "saves",
  "save",
  "saved",
  "please",
  "want",
  "only",
  "just",
  "some",
  "to",
  "is",
  "are",
  "was",
  "were",
  // Date/scope prepositions that carry no filter value on their own; dropping
  // them keeps phrases like "saves from yesterday" or "videos in arena" clean.
  "from",
  "in",
  "on",
  "during",
  "within",
  "around",
  "ago",
]);

const NEGATORS = new Set(["not", "no", "without", "except", "excluding"]);

// Phrase (lowercased) -> date-preset ISO duration; resolved against now() by the
// matcher. Multi-word phrases are tried before single words.
const DATE_PHRASES: ReadonlyArray<[string, string]> = [
  ["past 6 months", "-P6M"],
  ["last 6 months", "-P6M"],
  ["past 3 months", "-P3M"],
  ["last 3 months", "-P3M"],
  ["past three months", "-P3M"],
  ["past 30 days", "-P1M"],
  ["last 30 days", "-P1M"],
  ["past 7 days", "-P1W"],
  ["last 7 days", "-P1W"],
  ["past 3 days", "-P3D"],
  ["last 3 days", "-P3D"],
  ["past 2 days", "-P2D"],
  ["last 2 days", "-P2D"],
  ["last few days", "-P3D"],
  ["this week", "-P1W"],
  ["past week", "-P1W"],
  ["last week", "-P1W"],
  ["this month", "-P1M"],
  ["past month", "-P1M"],
  ["last month", "-P1M"],
  ["this year", "-P1Y"],
  ["past year", "-P1Y"],
  ["last year", "-P1Y"],
  ["recently", "-P1W"],
  ["recent", "-P1W"],
  // The matcher only supports cumulative "since now - N" windows, so "yesterday"
  // resolves to the last two days (includes yesterday's saves) rather than a
  // strict single-day range.
  ["yesterday", "-P2D"],
  ["past 24 hours", "-P1D"],
  ["past day", "-P1D"],
  ["today", "-P1D"],
];

// Words that qualify which date a following phrase refers to. "published last
// week" -> publishedAt; "updated today" -> modifiedAt; bare phrases -> savedAt.
const DATE_FIELD_KEYWORDS: Record<string, FieldId> = {
  published: "publishedAt",
  posted: "publishedAt",
  modified: "modifiedAt",
  updated: "modifiedAt",
  edited: "modifiedAt",
  changed: "modifiedAt",
  saved: "savedAt",
  added: "savedAt",
  created: "savedAt",
};

// Spoken type words -> a canonical media type (only emitted if it's a real type).
const TYPE_SYNONYMS: Record<string, string> = {
  video: "video",
  videos: "video",
  clip: "video",
  clips: "video",
  movie: "video",
  movies: "video",
  image: "image",
  images: "image",
  photo: "image",
  photos: "image",
  pic: "image",
  pics: "image",
  picture: "image",
  pictures: "image",
  gif: "image",
  gifs: "image",
  link: "link",
  links: "link",
  url: "link",
  urls: "link",
  article: "link",
  articles: "link",
  website: "link",
  websites: "link",
};

// Spoken source words -> a canonical source id (only emitted if it's a real source).
const SOURCE_SYNONYMS: Record<string, string> = {
  twitter: "twitter",
  tweet: "twitter",
  tweets: "twitter",
  x: "twitter",
  arena: "arena",
  "are.na": "arena",
  pinterest: "pinterest",
  pin: "pinterest",
  pins: "pinterest",
  instagram: "instagram",
  insta: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  yt: "youtube",
  reddit: "reddit",
  threads: "threads",
  cosmos: "cosmos",
};

interface Candidate {
  // Lowercased phrase to match, longest-first.
  phrase: string;
  field: Predicate["field"];
  // Resolved value to accumulate for that field.
  value: string;
}

function buildCandidates(facets: NlFacets): Candidate[] {
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

interface Accumulator {
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

function newAccumulator(): Accumulator {
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

function accumulate(acc: Accumulator, c: Candidate, negate: boolean): void {
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
function toPredicates(acc: Accumulator): Predicate[] {
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

// Spelled-out small numbers, so "more than one" works like "more than 1".
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function parseCount(word: string): number | null {
  if (word in NUMBER_WORDS) return NUMBER_WORDS[word] ?? null;
  if (/^\d+$/.test(word)) {
    const n = Number.parseInt(word, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Quantifier phrases that precede a number, mapped to a numeric comparator.
// Longest phrases are listed first so "at least" beats a bare "least".
const COUNT_PHRASES: ReadonlyArray<[string[], ComparatorId]> = [
  [["more", "than"], "gt"],
  [["greater", "than"], "gt"],
  [["at", "least"], "gte"],
  [["fewer", "than"], "lt"],
  [["less", "than"], "lt"],
  [["at", "most"], "lte"],
  [["no", "more", "than"], "lte"],
  [["up", "to"], "lte"],
  [["over"], "gt"],
  [["under"], "lt"],
  [["exactly"], "eq"],
];

// Bare adjectives that imply "more than one file" (a gallery / carousel).
const MULTI_WORDS = new Set(["multiple", "several", "many"]);

// Spoken quantities for durations ("an hour", "a minute").
function parseQuantity(word: string): number | null {
  if (word === "a" || word === "an") return 1;
  return parseCount(word);
}

// Time units -> seconds (duration is stored in seconds).
const DURATION_UNITS: Record<string, number> = {
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  m: 60,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  h: 3600,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
};

// A glued token like "30s", "5min", "2hrs".
const COMBINED_DURATION_RE =
  /^(\d+(?:\.\d+)?)(s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?)$/;

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

// Quantifier phrases for durations: the generic count phrases plus the
// duration-specific "longer/shorter than".
const DURATION_PHRASES: ReadonlyArray<[string[], ComparatorId]> = [
  [["longer", "than"], "gt"],
  [["shorter", "than"], "lt"],
  ...COUNT_PHRASES,
];

// Duration intents over a video/audio's length: "short videos", "longer than 5
// minutes", "under 2 min", "over an hour", "at least 30s". Runs before the file
// count intent so "more than 5 minutes" reads as a duration, not a file count.
function matchDurationIntent(
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
function matchCountIntent(
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

// Date phrases sorted longest-first so "past 6 months" beats "month".
const SORTED_DATE_PHRASES = [...DATE_PHRASES].sort(
  (a, b) => b[0].split(/\s+/).length - a[0].split(/\s+/).length,
);

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
function matchDateIntent(
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

// Sort adjectives -> an ordering directive.
const SORT_WORDS: Record<string, AskSort> = {
  newest: { key: "savedAt", dir: "desc" },
  latest: { key: "savedAt", dir: "desc" },
  oldest: { key: "savedAt", dir: "asc" },
  earliest: { key: "savedAt", dir: "asc" },
  longest: { key: "duration", dir: "desc" },
  shortest: { key: "duration", dir: "asc" },
};

// Recognize ordering / cap phrasing: "newest", "most recent", "top 10",
// "first 5", "10 newest". Returns a partial directive plus tokens consumed.
function matchSortLimit(
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

// Leading words that assert presence / absence of an attribute.
const WITH_WORDS = new Set(["with", "has", "have", "having", "contains"]);
const WITHOUT_WORDS = new Set(["without", "no", "missing", "lacks"]);

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
function matchIntent(
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
  const words = input
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
  // Which date field an upcoming date phrase applies to, set by a qualifier
  // like "published" / "updated" and cleared once consumed or interrupted.
  let pendingDateField: FieldId | null = null;
  while (i < words.length) {
    const word = words[i] as string;

    // A date qualifier ("published", "updated") steers the next date phrase.
    const dateField = DATE_FIELD_KEYWORDS[word];
    if (dateField) {
      pendingDateField = dateField;
      i += 1;
      continue;
    }

    // Date intents (incl. before/after/year), honoring a pending qualifier.
    const date = matchDateIntent(words, i, pendingDateField ?? "savedAt");
    if (date) {
      intentPreds.push(date.pred);
      pendingDateField = null;
      i += date.len;
      negateNext = false;
      continue;
    }

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

    if (!FILLER.has(word)) {
      residual.push(word);
      // A real (non-date, unmatched) word breaks the qualifier's reach.
      pendingDateField = null;
    }
    negateNext = false;
    i += 1;
  }

  const rules = dedupePredicates([...toPredicates(acc), ...intentPreds]);
  const query: Query = { combinator: "and", rules };
  return { query, residual: residual.join(" "), sort, limit };
}

function matchCandidate(
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

// Flatten a (possibly nested) query into its predicates, for chip display.
export function flattenPredicates(clause: Clause): Predicate[] {
  if ("rules" in clause) return clause.rules.flatMap(flattenPredicates);
  return [clause];
}
