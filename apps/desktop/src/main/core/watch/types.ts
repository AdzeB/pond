import type { Source } from "@pond/schema/db";

export interface WatchEntry {
  url: string;
  sourceId: string;
}

export type WatchHarvestResult =
  | { ok: true; entries: WatchEntry[] }
  | {
      ok: false;
      reason:
        | "not_found"
        | "auth_required"
        | "rate_limited"
        | "timeout"
        | "unavailable"
        | "unknown";
    };

const WATCHABLE_SOURCES: readonly Source[] = [
  "arena",
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "pinterest",
  "cosmos",
];

export function isWatchableSource(source: Source): boolean {
  return WATCHABLE_SOURCES.includes(source);
}

export const WATCH_NEEDS_SESSION: readonly Source[] = ["instagram", "twitter"];
