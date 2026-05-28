import {
  DEFAULT_GLOBAL_SYNC_PREFS,
  type GlobalSyncPrefs,
  type SyncFrequency,
} from "@pond/schema/db";

export type RepeatPreset =
  | "every_hour"
  | "every_6h"
  | "every_day"
  | "every_weekday"
  | "every_weekend"
  | "custom";

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_INDICES = [1, 2, 3, 4, 5];
export const WEEKEND_INDICES = [0, 6];

export const WEEKDAYS: Array<{ index: number; short: string; full: string }> = [
  { index: 0, short: "S", full: "Sunday" },
  { index: 1, short: "M", full: "Monday" },
  { index: 2, short: "T", full: "Tuesday" },
  { index: 3, short: "W", full: "Wednesday" },
  { index: 4, short: "T", full: "Thursday" },
  { index: 5, short: "F", full: "Friday" },
  { index: 6, short: "S", full: "Saturday" },
];

export const FREQUENCY_OPTIONS: Array<{
  value: SyncFrequency;
  label: string;
}> = [
  { value: "hourly", label: "Hourly" },
  { value: "every6h", label: "Every 6\u00A0hours" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export const REPEAT_PRESETS: Array<{
  value: Exclude<RepeatPreset, "custom">;
  label: string;
  secondary?: string;
}> = [
  { value: "every_hour", label: "Every hour" },
  { value: "every_6h", label: "Every 6\u00A0hours" },
  { value: "every_day", label: "Every day" },
  { value: "every_weekday", label: "Every weekday", secondary: "Mon\u2013Fri" },
  { value: "every_weekend", label: "Every weekend", secondary: "Sat\u2013Sun" },
];

export function setEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const n of b) if (!sa.has(n)) return false;
  return true;
}

export function presetFromPrefs(prefs: GlobalSyncPrefs): RepeatPreset {
  switch (prefs.frequency) {
    case "hourly":
      return "every_hour";
    case "every6h":
      return "every_6h";
    case "daily":
      return setEqual(prefs.weekdays, ALL_DAYS) ? "every_day" : "custom";
    case "weekly":
      if (setEqual(prefs.weekdays, ALL_DAYS)) return "every_day";
      if (setEqual(prefs.weekdays, WEEKDAY_INDICES)) return "every_weekday";
      if (setEqual(prefs.weekdays, WEEKEND_INDICES)) return "every_weekend";
      return "custom";
    default:
      return "custom";
  }
}

export function applyPreset(
  preset: Exclude<RepeatPreset, "custom">,
): Partial<GlobalSyncPrefs> {
  switch (preset) {
    case "every_hour":
      return { frequency: "hourly", weekdays: ALL_DAYS };
    case "every_6h":
      return { frequency: "every6h", weekdays: ALL_DAYS };
    case "every_day":
      return { frequency: "daily", weekdays: ALL_DAYS };
    case "every_weekday":
      return { frequency: "weekly", weekdays: WEEKDAY_INDICES };
    case "every_weekend":
      return { frequency: "weekly", weekdays: WEEKEND_INDICES };
  }
}

export function formatRepeatTrigger(prefs: GlobalSyncPrefs): string {
  const preset = presetFromPrefs(prefs);
  if (preset !== "custom") {
    return REPEAT_PRESETS.find((p) => p.value === preset)?.label ?? "Custom";
  }
  if (prefs.frequency === "weekly") {
    const days = [...prefs.weekdays].sort((a, b) => a - b);
    if (days.length === 1) {
      const w = WEEKDAYS[days[0] as number];
      return w ? `Every ${w.full}` : "Custom";
    }
    return days
      .map((d) => WEEKDAYS[d]?.full.slice(0, 3))
      .filter(Boolean)
      .join(", ");
  }
  return "Custom";
}

export function frequencyHasAnchor(frequency: SyncFrequency): boolean {
  return frequency === "daily" || frequency === "weekly";
}

const RELATIVE_FMT = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60_000],
  ["month", 30 * 24 * 60 * 60_000],
  ["week", 7 * 24 * 60 * 60_000],
  ["day", 24 * 60 * 60_000],
  ["hour", 60 * 60_000],
  ["minute", 60_000],
];

export function formatRelative(at: Date): string {
  const diff = at.getTime() - Date.now();
  const abs = Math.abs(diff);
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) {
      const value = Math.round(diff / ms);
      return RELATIVE_FMT.format(value, unit);
    }
  }
  return RELATIVE_FMT.format(Math.round(diff / 1000), "second");
}

export interface ScheduleStatus {
  lastFireAt: string | null;
  nextDueAt: string | null;
}

export function formatScheduleFooter(
  status: ScheduleStatus,
  enabled: boolean,
): string {
  const parts: string[] = [];
  parts.push(
    status.lastFireAt
      ? `Last sync ${formatRelative(new Date(status.lastFireAt))}`
      : "No syncs yet",
  );
  if (enabled) {
    if (status.nextDueAt) {
      const due = new Date(status.nextDueAt);
      parts.push(
        due.getTime() <= Date.now()
          ? "Next sync due now"
          : `Next sync ${formatRelative(due)}`,
      );
    } else {
      parts.push("Schedule misconfigured");
    }
  } else {
    parts.push("Background sync is off");
  }
  return parts.join(" \u00B7 ");
}

export { DEFAULT_GLOBAL_SYNC_PREFS };
export type { GlobalSyncPrefs, SyncFrequency };
