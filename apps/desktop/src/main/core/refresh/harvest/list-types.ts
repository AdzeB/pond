import type { MediaType } from "@pond/schema/db";

export interface ListHarvestArgs {
  knownIds: string[];
}

// Per-item list output; only url+sourceId are consumed, the rest is for the progress UI.
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
}

export type ListHarvestResult =
  | { ok: true; entries: ListEntry[]; reachedEnd: boolean }
  | { ok: false; reason: "auth_required" | "no_match" | "timeout" | "unknown" };
