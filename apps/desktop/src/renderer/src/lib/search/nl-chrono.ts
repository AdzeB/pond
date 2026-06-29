import type { FieldId, Predicate } from "@pond/schema/filters/types";
import * as chrono from "chrono-node";
import { ROLLING_WINDOWS } from "@/lib/search/nl-vocabulary";

// The date half of the Stage A compiler. Dates are the one sub-language where a
// real grammar (absolute dates, calendar ranges, "two weeks ago", "before May
// 2023") beats a phrase table, so chrono-node owns it. The exception is the
// handful of *rolling* windows ("last 3 months" = the last ~90 days, not the
// previous calendar quarter): those carry intentional product semantics, so a
// small curated table claims them first and emits relative ISO durations that
// resolve against now() downstream.
//
// `extractDates` is a char-span pre-pass: it returns the date predicates and the
// input with those spans blanked, so the token walker never sees a date.

type ChronoResult = ReturnType<typeof chrono.parse>[number];
type ChronoComponents = ChronoResult["start"];

export interface DateExtraction {
  predicates: Predicate[];
  // Input with every matched date span replaced by spaces (offsets preserved).
  rest: string;
}

// Direction words that flip a date into an open-ended comparison.
const DIRECTION: Record<string, "before" | "after" | "since"> = {
  before: "before",
  older: "before",
  earlier: "before",
  after: "after",
  newer: "after",
  since: "since",
};

// Qualifier words that retarget which date field a phrase constrains.
const QUALIFIER: Record<string, FieldId> = {
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

// A leading "<qualifier>? <direction>? (than|to)? <preposition>?" run before a
// date phrase ("published before", "updated in", "posted on").
const PREFIX_RE =
  /(?:\b(published|posted|modified|updated|edited|changed|saved|added|created)\b\s+)?(?:\b(before|after|since|older|newer|earlier)\b\s+(?:than\s+|to\s+)?)?(?:\b(?:in|on|from|during|of)\b\s+)?$/i;

// A glued/spaced media duration ("5 minutes", "30s") — these are video lengths,
// not dates, and must not be eaten by chrono.
const DURATION_TEXT =
  /\b\d+(?:\.\d+)?\s*(?:s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?)\b/i;

const YEAR_RE = /\b(?:19|20)\d{2}\b/g;

// Connector that joins two date references into one range ("march to june",
// "2021 - 2023"); chrono returns these as two separate results.
const RANGE_CONNECTOR = /^\s*(?:and|to|through|until|-|–|—)\s*$/i;

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
const addYears = (d: Date, n: number) => new Date(d.getFullYear() + n, 0, 1);

interface Span {
  start: number;
  end: number;
}

// Widen a date to the half-open [lo, hi) range of `c`'s coarsest certain unit,
// so "march 2023" spans the whole month, "2024" the whole year, and a full date
// just its day. `date` is split out so a range can borrow a sibling's year.
function widen(c: ChronoComponents, date: Date): [Date, Date] {
  if (c.isCertain("day")) {
    const lo = startOfDay(date);
    return [lo, addDays(lo, 1)];
  }
  if (c.isCertain("month")) {
    const lo = startOfMonth(date);
    return [lo, addMonths(lo, 1)];
  }
  const lo = startOfYear(date);
  return [lo, addYears(lo, 1)];
}

function impliedRange(c: ChronoComponents): [Date, Date] {
  return widen(c, c.date());
}

// The lower bound of `c`, borrowing `year` when `c` omitted one. Lets the start
// of "march to june 2023" inherit 2023 instead of defaulting to this year.
function lowerWithYear(c: ChronoComponents, year: number | null): Date {
  if (year == null || c.isCertain("year")) return impliedRange(c)[0];
  const month = (c.get("month") ?? 1) - 1;
  const day = c.isCertain("day") ? (c.get("day") ?? 1) : 1;
  return widen(c, new Date(year, month, day))[0];
}

function yearRange(year: number): [Date, Date] {
  return [new Date(year, 0, 1), new Date(year + 1, 0, 1)];
}

// Time-only references ("3pm", "in 5 minutes") carry no date and should be left
// for the duration matcher or dropped.
function isTimeOnly(c: ChronoComponents): boolean {
  const hasDate =
    c.isCertain("day") ||
    c.isCertain("month") ||
    c.isCertain("year") ||
    c.isCertain("weekday");
  const hasTime =
    c.isCertain("hour") || c.isCertain("minute") || c.isCertain("second");
  return hasTime && !hasDate;
}

// Read the qualifier/direction run immediately before `start`, returning the
// resolved field, direction, and how far back the run reaches (so it can be
// folded into the consumed span and kept out of the residual).
function readPrefix(
  input: string,
  start: number,
): {
  field: FieldId;
  dir: "before" | "after" | "since" | null;
  from: number;
} {
  const m = PREFIX_RE.exec(input.slice(0, start));
  if (!m || m[0].length === 0) {
    return { field: "savedAt", dir: null, from: start };
  }
  const qualifier = m[1]?.toLowerCase();
  const direction = m[2]?.toLowerCase();
  return {
    field: qualifier ? (QUALIFIER[qualifier] ?? "savedAt") : "savedAt",
    dir: direction ? (DIRECTION[direction] ?? null) : null,
    from: start - m[0].length,
  };
}

function directionalPredicate(
  field: FieldId,
  dir: "before" | "after" | "since" | null,
  lo: Date,
  hi: Date,
): Predicate {
  if (dir === "before") return { field, operator: "lt", value: isoDay(lo) };
  if (dir === "after") return { field, operator: "gte", value: isoDay(hi) };
  if (dir === "since") return { field, operator: "gte", value: isoDay(lo) };
  return { field, operator: "between", value: [isoDay(lo), isoDay(hi)] };
}

// Resolve a rolling window's field + leading direction (rolling phrases only
// claim a span when no direction precedes them, so chrono can own "before last
// week"); returns null when a direction is present.
function rollingPrefix(
  input: string,
  start: number,
): {
  field: FieldId;
  from: number;
} | null {
  const m = PREFIX_RE.exec(input.slice(0, start));
  if (m?.[2]) return null; // a direction word — defer to chrono
  const qualifier = m?.[1]?.toLowerCase();
  return {
    field: qualifier ? (QUALIFIER[qualifier] ?? "savedAt") : "savedAt",
    from: m && m[0].length > 0 ? start - m[0].length : start,
  };
}

export function extractDates(
  input: string,
  ref: Date = new Date(),
): DateExtraction {
  const predicates: Predicate[] = [];
  const consumed: Span[] = [];
  const overlaps = (s: number, e: number) =>
    consumed.some((c) => s < c.end && e > c.start);
  const claim = (s: number, e: number, pred: Predicate) => {
    consumed.push({ start: s, end: e });
    predicates.push(pred);
  };

  // 1. Curated rolling windows ("last 3 months" -> >= now - P3M), claimed first
  //    so chrono can't re-read them as bounded calendar ranges.
  for (const [phrase, iso] of ROLLING_WINDOWS) {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    for (let m = re.exec(input); m; m = re.exec(input)) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(start, end)) continue;
      const prefix = rollingPrefix(input, start);
      if (!prefix) continue;
      claim(prefix.from, end, {
        field: prefix.field,
        operator: "gte",
        value: iso,
      });
    }
  }

  // 2. chrono owns everything else: absolute dates, ranges, "two weeks ago",
  //    "before May 2023", qualifier-scoped phrases.
  const results = chrono.parse(input, ref, { forwardDate: false });
  for (let idx = 0; idx < results.length; idx += 1) {
    const r = results[idx];
    if (!r) continue;
    const start = r.index;
    const end = start + r.text.length;
    if (overlaps(start, end)) continue;
    if (isTimeOnly(r.start)) continue;
    if (DURATION_TEXT.test(r.text) && !/\bago\b/i.test(r.text)) continue;

    const { field, dir, from } = readPrefix(input, start);

    // Stitch "march to june 2023" / "2021 - 2023": chrono returns two results
    // joined only by a connector, so the second's year flows back to the first.
    const next = results[idx + 1];
    if (next && RANGE_CONNECTOR.test(input.slice(end, next.index))) {
      const tail = next.end ?? next.start;
      const lo = lowerWithYear(r.start, tail.get("year"));
      const hi = impliedRange(tail)[1];
      claim(from, next.index + next.text.length, {
        field,
        operator: "between",
        value: [isoDay(lo), isoDay(hi)],
      });
      idx += 1;
      continue;
    }

    const [lo] = impliedRange(r.start);
    const hi = r.end ? impliedRange(r.end)[1] : impliedRange(r.start)[1];
    claim(from, end, directionalPredicate(field, dir, lo, hi));
  }

  // 3. Bare years chrono may not parse on their own ("from 2024", "before 2020").
  for (let m = YEAR_RE.exec(input); m; m = YEAR_RE.exec(input)) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(start, end)) continue;
    const { field, dir, from } = readPrefix(input, start);
    const [lo, hi] = yearRange(Number.parseInt(m[0], 10));
    claim(from, end, directionalPredicate(field, dir, lo, hi));
  }

  // Blank every consumed span so the token walker never sees a date word.
  let rest = input;
  for (const { start, end } of consumed) {
    rest = rest.slice(0, start) + " ".repeat(end - start) + rest.slice(end);
  }

  return { predicates, rest };
}
