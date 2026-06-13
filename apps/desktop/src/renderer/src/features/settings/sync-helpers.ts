import {
  DEFAULT_GLOBAL_SYNC_PREFS,
  type GlobalSyncPrefs,
  type SyncFrequency,
} from "@pond/schema/db";

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const WEEKDAYS: Array<{ index: number; short: string; full: string }> = [
  { index: 0, short: "S", full: "Sunday" },
  { index: 1, short: "M", full: "Monday" },
  { index: 2, short: "T", full: "Tuesday" },
  { index: 3, short: "W", full: "Wednesday" },
  { index: 4, short: "T", full: "Thursday" },
  { index: 5, short: "F", full: "Friday" },
  { index: 6, short: "S", full: "Saturday" },
];

export function frequencyHasAnchor(frequency: SyncFrequency): boolean {
  return frequency === "daily" || frequency === "weekly";
}

export type { GlobalSyncPrefs, SyncFrequency };
export { DEFAULT_GLOBAL_SYNC_PREFS };
