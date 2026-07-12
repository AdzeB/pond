import type { Source } from "@pond/schema/db";

// One harvested public post, newest-first in a listing.
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

// Sources a watch can target. Everything is public except Instagram/Twitter,
// whose checks ride a connected account's session (`via`).
export const WATCHABLE_SOURCES: readonly Source[] = [
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

// Sources whose watch checks need a signed-in session to borrow.
export const WATCH_NEEDS_SESSION: readonly Source[] = ["instagram", "twitter"];
