import type { ListKind, MediaType } from "@pond/schema/db";

export interface ListHarvestArgs {
  knownIds: string[];
  earlyStop?: boolean;
}

export interface ListEntry {
  sourceId: string;
  url: string;
  savedAt?: string;
  title?: string;
  description?: string;
  author?: string;
  mediaUrl?: string;
  mediaUrls?: Array<{ url: string; type?: MediaType; poster?: string }>;
  mediaType?: MediaType;
  listKinds?: ListKind[];
}

export type ListHarvestResult =
  | {
      ok: true;
      entries: ListEntry[];
      reachedEnd: boolean;
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
      retryAfterSec?: number;
    };
