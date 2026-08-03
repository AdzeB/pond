import type { MediaType } from "@pond/schema/db";

export interface ListHarvestArgs {
  knownIds: string[];
  /** When false, keep paging past a known backlog (full walks). Defaults to true when knownIds is non-empty. */
  earlyStop?: boolean;
}

/** Only url+sourceId are consumed; the rest feeds the progress UI. */
interface ListEntry {
  sourceId: string;
  url: string;
  savedAt?: string;
  title?: string;
  description?: string;
  author?: string;
  mediaUrl?: string;
  mediaUrls?: Array<{ url: string; type?: MediaType; poster?: string }>;
  mediaType?: MediaType;
}

export type ListHarvestResult =
  | {
      ok: true;
      entries: ListEntry[];
      reachedEnd: boolean;
      /** Total items scanned this run, for honest sync.seen metrics; falls back to entries.length when unset. */
      seen?: number;
    }
  | {
      ok: false;
      reason:
        | "auth_required"
        | "no_match"
        | "timeout"
        | "unknown"
        | "rate_limited";
      /** Server-requested wait in seconds; present on rate_limited. */
      retryAfterSec?: number;
    };
