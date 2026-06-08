import type { GlobalSyncPrefs } from "@pond/schema/db";
import { RRule, type Weekday } from "rrule";

const HOUR_MS = 60 * 60 * 1000;

// JS `Date.getDay()` (0 = Sunday … 6 = Saturday) → RRule weekday constants.
const RRULE_WEEKDAYS: Weekday[] = [
  RRule.SU,
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
];

// RRule evaluates everything in UTC. We want a "floating" local wall-clock
// schedule ("09:00 on these weekdays" in the user's timezone, regardless of
// DST), so we shift the local fields into UTC, let RRule do the calendar
// math, then read the UTC fields back out as local time.
function toFloating(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
    ),
  );
}

function fromFloating(d: Date): Date {
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  );
}

export interface ParsedTime {
  hours: number;
  minutes: number;
}

export function parseHHmm(value: string): ParsedTime | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function nextAnchored(
  from: Date,
  anchorTime: string,
  weekdays: number[],
): Date | null {
  const parsed = parseHHmm(anchorTime);
  if (!parsed) return null;
  const byweekday = weekdays
    .filter((d) => d >= 0 && d <= 6)
    .map((d) => RRULE_WEEKDAYS[d] as Weekday);
  if (byweekday.length === 0) return null;

  const floatingFrom = toFloating(from);
  const rule = new RRule({
    freq: RRule.WEEKLY,
    byweekday,
    byhour: parsed.hours,
    byminute: parsed.minutes,
    bysecond: 0,
    // dtstart must precede `from` so the first matching occurrence is found.
    dtstart: new Date(
      Date.UTC(
        floatingFrom.getUTCFullYear() - 1,
        0,
        1,
        parsed.hours,
        parsed.minutes,
        0,
      ),
    ),
  });

  // `after(date, false)` returns the first occurrence strictly after `from`.
  const occ = rule.after(floatingFrom, false);
  return occ ? fromFloating(occ) : null;
}

export function computeNextDueAt(
  prefs: GlobalSyncPrefs,
  now: Date,
): Date | null {
  if (!prefs.enabled) return null;
  const lastFire = prefs.lastFireAt ? new Date(prefs.lastFireAt) : null;
  const lastFireValid = lastFire && !Number.isNaN(lastFire.getTime());

  let due: Date;
  switch (prefs.frequency) {
    case "hourly":
      due = lastFireValid ? new Date(lastFire.getTime() + HOUR_MS) : now;
      break;
    case "every6h":
      due = lastFireValid ? new Date(lastFire.getTime() + 6 * HOUR_MS) : now;
      break;
    case "daily":
    case "weekly": {
      const from = lastFireValid
        ? new Date(Math.max(lastFire.getTime(), now.getTime() - 1))
        : new Date(now.getTime() - 1);
      const anchor = nextAnchored(from, prefs.anchorTime, prefs.weekdays);
      if (!anchor) return null;
      due = anchor;
      break;
    }
    default:
      return null;
  }

  return due;
}
