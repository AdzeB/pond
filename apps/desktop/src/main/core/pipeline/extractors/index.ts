import type { Source } from "@pond/schema/db";
import type { ExternalSource } from "@pond/schema/sources";
import { UnsupportedError } from "./errors";
import { ArenaBlockExtractor } from "./sources/arena";
import { CosmosTileExtractor } from "./sources/cosmos";
import { InstagramPostExtractor } from "./sources/instagram";
import { PinterestPinExtractor } from "./sources/pinterest";
import { RedditPostExtractor } from "./sources/reddit";
import { TikTokVideoExtractor } from "./sources/tiktok";
import { TwitterTweetExtractor } from "./sources/twitter";
import { YouTubeWatchExtractor } from "./sources/youtube";
import type { Extractor } from "./types";

// One extractor per source; missing one = compile error. Order = URL match order.
const EXTRACTORS = {
  twitter: new TwitterTweetExtractor(),
  instagram: new InstagramPostExtractor(),
  tiktok: new TikTokVideoExtractor(),
  youtube: new YouTubeWatchExtractor(),
  pinterest: new PinterestPinExtractor(),
  arena: new ArenaBlockExtractor(),
  cosmos: new CosmosTileExtractor(),
  reddit: new RedditPostExtractor(),
} as const satisfies Record<ExternalSource, Extractor>;

/** All extractors in URL-resolution order. Exported for the test runner. */
export const EXTRACTOR_LIST: readonly Extractor[] = Object.values(EXTRACTORS);

/** The extractor for a source, or `null` for `local` (which has none). */
export function extractorFor(source: Source): Extractor | null {
  return source === "local" ? null : EXTRACTORS[source];
}

export function resolveExtractor(rawUrl: string): Extractor {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsupportedError(`invalid url: ${rawUrl}`);
  }
  for (const ex of EXTRACTOR_LIST) {
    if (ex.suitable(url)) return ex;
  }
  throw new UnsupportedError(`no extractor for ${rawUrl}`);
}

export function classifyUrlToSource(rawUrl: string): {
  source: Source | null;
  extractorId: string | null;
} {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { source: null, extractorId: null };
  }
  for (const ex of EXTRACTOR_LIST) {
    if (ex.suitable(url)) {
      return { source: ex.source, extractorId: ex.id };
    }
  }
  return { source: null, extractorId: null };
}

export * from "./errors";
