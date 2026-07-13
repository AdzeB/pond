import type { Source } from "@pond/schema/db";
import {
  ARENA_PATTERNS,
  firstMatch,
  INSTAGRAM_PATTERNS,
  PINTEREST_PATTERNS,
  REDDIT_PATTERNS,
  THREADS_PATTERNS,
  TIKTOK_PATTERNS,
  TWITTER_PATTERNS,
  YOUTUBE_PATTERNS,
} from "./extractors/url-patterns";

/** Canonical id for `saves.source_id`, matching the extractor's regex capture. */
export function sourceIdFromUrl(source: Source, rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  switch (source) {
    case "twitter": {
      const m = firstMatch(url, TWITTER_PATTERNS);
      return m?.[1] ?? null;
    }
    case "instagram": {
      const m = firstMatch(url, INSTAGRAM_PATTERNS);
      return m?.[1] ?? null;
    }
    case "pinterest": {
      const m = firstMatch(url, PINTEREST_PATTERNS);
      /** pin.it short link: no numeric id without a follow; use the slug. */
      return m?.[1] ?? (url.pathname.replace(/^\//, "") || null);
    }
    case "arena": {
      const m = firstMatch(url, ARENA_PATTERNS);
      return m?.[1] ?? null;
    }
    case "cosmos": {
      /** Cosmos uses path segments; keep them stable as the id. */
      return url.pathname.replace(/\/$/, "").replace(/^\//, "") || null;
    }
    case "tiktok": {
      const m = firstMatch(url, TIKTOK_PATTERNS);
      return m?.[1] ?? null;
    }
    case "youtube": {
      const m = firstMatch(url, YOUTUBE_PATTERNS);
      return m?.[1] ?? null;
    }
    case "reddit": {
      const m = firstMatch(url, REDDIT_PATTERNS);
      return m?.[1] ?? null;
    }
    case "threads": {
      const m = firstMatch(url, THREADS_PATTERNS);
      return m?.[1] ?? null;
    }
    case "web":
      /** Generic links have no upstream id; the normalized href is the dedupe key. */
      return url.href;
    case "local":
      /** Local saves mint their own id; no upstream URL. */
      return null;
  }
}
