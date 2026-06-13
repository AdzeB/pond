import type { MediaType } from "@pond/schema/db";
import type { Capture, CaptureMedia, RawJson } from "@pond/schema/raw";
import type { BookmarksEntry, RichTweet } from "../refresh/harvest/twitter";

// How far down a quote-of-a-quote chain we follow. The GraphQL response
// nests `quoted_status_result` recursively; we cap to keep media merges
// and the screenshot walker bounded (see capture-tweet.ts) and to avoid
// hammering X for pathological chains.
const QUOTE_DEPTH_CAP = 3;

export interface QuotedTweetRef {
  tweetId: string;
  url: string;
}

export interface SaveSeed {
  rawJson: RawJson;
  title?: string | null;
  description?: string | null;
  author?: string | null;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  publishedAt?: Date | null;
  lang?: string | null;
}

// When the bookmarks sync gives us a rich tweet from the GraphQL response
// we already have everything `harvest_metadata` would otherwise re-scrape
// (title, body, author, media, metrics). Hand the seed to the pipeline so
// `isFreshHarvest` short-circuits the navigate step. X rate-limits hard
// once a partition starts loading ~hundreds of individual tweet pages back
// to back, which is what made every freshly-synced bookmark land as
// `failed`.
export function buildTwitterBookmarkSeed(
  entry: BookmarksEntry,
): SaveSeed | null {
  const rich = entry.rich;
  if (!rich) return null;

  const handle =
    rich.author.handle || (entry.author ? entry.author.replace(/^@/, "") : "");
  const name = rich.author.name || handle || null;
  const avatarUrl = rich.author.avatarUrl ?? null;

  const media: CaptureMedia[] = [];
  const seenMedia = new Set<string>();
  const pushMedia = (list: RichTweet["media"]): void => {
    for (const m of list) {
      if (seenMedia.has(m.url)) continue;
      seenMedia.add(m.url);
      media.push({
        url: m.url,
        type: m.type === "video" ? "video" : "image",
        ...(m.poster ? { posterUrl: m.poster } : {}),
      });
    }
  };
  pushMedia(rich.media);

  // Walk the quote chain, merging each quoted tweet's media into the
  // parent save's carousel and recording the chain so the screenshot
  // walker (capture-tweet.ts) has a starting list.
  const quotedTweets: QuotedTweetRef[] = [];
  let quoted = rich.quoted;
  for (let depth = 0; quoted && depth < QUOTE_DEPTH_CAP; depth += 1) {
    quotedTweets.push({ tweetId: quoted.tweetId, url: quoted.url });
    pushMedia(quoted.media);
    quoted = quoted.quoted;
  }

  const publishedAt = readLegacyCreatedAt(rich.raw);

  const title = pickTitle(rich.fullText, entry.title);
  const description = rich.fullText || entry.description || null;

  const capture: Capture = {
    id: entry.tweetId,
    source: "twitter",
    url: entry.url,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(name || handle || avatarUrl
      ? {
          author: {
            ...(name ? { name } : {}),
            ...(handle ? { handle } : {}),
            ...(avatarUrl ? { avatarUrl } : {}),
          },
        }
      : {}),
    ...(publishedAt ? { publishedAt: publishedAt.toISOString() } : {}),
    media,
    ...(rich.metrics && Object.keys(rich.metrics).length > 0
      ? { metrics: { ...rich.metrics } }
      : {}),
    ...(quotedTweets.length > 0 ? { extras: { quotedTweets } } : {}),
  };

  const rawJson: RawJson = {
    capture,
    extractorId: "twitter-bookmark-seed",
    extractedAt: new Date().toISOString(),
  };

  return {
    rawJson,
    title: title ?? null,
    description: description ?? null,
    author: name ?? (handle ? `@${handle}` : (entry.author ?? null)),
    mediaUrl: media[0]?.url ?? null,
    mediaType: pickMediaType(media),
    publishedAt,
    lang: null,
  };
}

const TITLE_CAP = 90;

function pickTitle(
  fullText: string,
  fallback: string | undefined,
): string | null {
  const firstLine = fullText.split(/\n+/)[0]?.trim();
  if (!firstLine) return fallback ?? null;
  if (firstLine.length <= TITLE_CAP) return firstLine;
  return `${firstLine.slice(0, TITLE_CAP - 1).trimEnd()}…`;
}

function pickMediaType(media: ReadonlyArray<CaptureMedia>): MediaType | null {
  if (media.length === 0) return null;
  let videos = 0;
  let images = 0;
  for (const m of media) {
    if (m.type === "video") videos++;
    else images++;
  }
  if (videos > 0 && images > 0) return "mixed";
  return videos > images ? "video" : "image";
}

function readLegacyCreatedAt(raw: unknown): Date | null {
  const legacy = (raw as { legacy?: { created_at?: unknown } } | null)?.legacy;
  const createdAt = legacy?.created_at;
  if (typeof createdAt !== "string") return null;
  const ms = Date.parse(createdAt);
  return Number.isFinite(ms) ? new Date(ms) : null;
}
