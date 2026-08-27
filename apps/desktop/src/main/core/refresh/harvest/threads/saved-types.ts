import type { ListKind, MediaType } from "@pond/schema/db";
import type { RichThread, SavedCapture } from "./graphql";

export interface SavedHarvestArgs {
  knownIds: string[];
}

export interface SavedEntry {
  postId: string;
  url: string;
  title?: string;
  description?: string;
  author?: string;
  mediaUrl?: string;
  mediaUrls?: Array<{
    url: string;
    type?: MediaType;
    poster?: string;
  }>;
  rich?: RichThread;
  listKinds?: ListKind[];
}

export type SavedHarvestResult =
  | {
      ok: true;
      entries: SavedEntry[];
      captures: SavedCapture[];
      reachedEnd: boolean;
    }
  | {
      ok: false;
      reason: "auth_required" | "no_match" | "timeout" | "rate_limited";
      retryAfterSec?: number;
    };
