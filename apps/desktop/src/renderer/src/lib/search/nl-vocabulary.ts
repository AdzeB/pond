import type { ComparatorId, FieldId } from "@pond/schema/filters/types";
import type { AskSort } from "@/lib/search/nl-query";

// Static vocabulary for the Stage A natural-language compiler: filler words,
// negators, and the lookup tables that map spoken phrases onto canonical filter
// values. Kept apart from the matching logic so the data is easy to scan and
// extend without wading through the algorithm.

// Conversational scaffolding that carries no filter intent.
export const FILLER = new Set([
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

export const NEGATORS = new Set([
  "not",
  "no",
  "without",
  "except",
  "excluding",
]);

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

// Date phrases sorted longest-first so "past 6 months" beats "month".
export const SORTED_DATE_PHRASES = [...DATE_PHRASES].sort(
  (a, b) => b[0].split(/\s+/).length - a[0].split(/\s+/).length,
);

// Words that qualify which date a following phrase refers to. "published last
// week" -> publishedAt; "updated today" -> modifiedAt; bare phrases -> savedAt.
export const DATE_FIELD_KEYWORDS: Record<string, FieldId> = {
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
export const TYPE_SYNONYMS: Record<string, string> = {
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
export const SOURCE_SYNONYMS: Record<string, string> = {
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

// Spelled-out small numbers, so "more than one" works like "more than 1".
export const NUMBER_WORDS: Record<string, number> = {
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

// Quantifier phrases that precede a number, mapped to a numeric comparator.
// Longest phrases are listed first so "at least" beats a bare "least".
export const COUNT_PHRASES: ReadonlyArray<[string[], ComparatorId]> = [
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
export const MULTI_WORDS = new Set(["multiple", "several", "many"]);

// Time units -> seconds (duration is stored in seconds).
export const DURATION_UNITS: Record<string, number> = {
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
export const COMBINED_DURATION_RE =
  /^(\d+(?:\.\d+)?)(s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?)$/;

// Quantifier phrases for durations: the generic count phrases plus the
// duration-specific "longer/shorter than".
export const DURATION_PHRASES: ReadonlyArray<[string[], ComparatorId]> = [
  [["longer", "than"], "gt"],
  [["shorter", "than"], "lt"],
  ...COUNT_PHRASES,
];

// Sort adjectives -> an ordering directive.
export const SORT_WORDS: Record<string, AskSort> = {
  newest: { key: "savedAt", dir: "desc" },
  latest: { key: "savedAt", dir: "desc" },
  oldest: { key: "savedAt", dir: "asc" },
  earliest: { key: "savedAt", dir: "asc" },
  longest: { key: "duration", dir: "desc" },
  shortest: { key: "duration", dir: "asc" },
};

// Leading words that assert presence / absence of an attribute.
export const WITH_WORDS = new Set([
  "with",
  "has",
  "have",
  "having",
  "contains",
]);
export const WITHOUT_WORDS = new Set(["without", "no", "missing", "lacks"]);
