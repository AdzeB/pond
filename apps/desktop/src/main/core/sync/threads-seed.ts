import type { MediaType } from "@pond/schema/db";
import { majorityMediaType } from "@pond/schema/media-type";
import type { Capture, CaptureMedia, RawJson } from "@pond/schema/raw";
import { pickTitle } from "../refresh/harvest/lib/title";
import type { RichThread } from "../refresh/harvest/threads/graphql";
import type { SavedEntry } from "../refresh/harvest/threads/saved-types";

const QUOTE_DEPTH_CAP = 3;

interface QuotedTweetRef {
  tweetId: string;
  url: string;
}

interface SaveSeed {
  rawJson: RawJson;
  title?: string | null;
  description?: string | null;
  author?: string | null;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  publishedAt?: Date | null;
  lang?: string | null;
}

/** Builds a seed from GraphQL data so harvest_metadata can skip a re-scrape. */
export function buildThreadsSavedSeed(entry: SavedEntry): SaveSeed | null {
  const rich = entry.rich;
  if (!rich) return null;

  const handle =
    rich.author.handle || (entry.author ? entry.author.replace(/^@/, "") : "");
  const name = rich.author.name || handle || null;
  const avatarUrl = rich.author.avatarUrl ?? null;

  const media: CaptureMedia[] = [];
  const seenMedia = new Set<string>();
  const pushMedia = (list: RichThread["media"]): void => {
    for (const m of list) {
      if (seenMedia.has(m.url)) continue;
      seenMedia.add(m.url);
      media.push({
        url: m.url,
        type: m.type === "video" ? "video" : "image",
        ...(m.poster ? { posterUrl: m.poster } : {}),
        ...(typeof m.width === "number" ? { width: m.width } : {}),
        ...(typeof m.height === "number" ? { height: m.height } : {}),
        ...(typeof m.durationSec === "number"
          ? { durationSec: m.durationSec }
          : {}),
      });
    }
  };
  pushMedia(rich.media);

  const quotedTweets: QuotedTweetRef[] = [];
  let quoted = rich.quoted;
  for (let depth = 0; quoted && depth < QUOTE_DEPTH_CAP; depth += 1) {
    quotedTweets.push({ tweetId: quoted.postId, url: quoted.url });
    pushMedia(quoted.media);
    quoted = quoted.quoted;
  }

  const publishedAt = rich.publishedAt ? new Date(rich.publishedAt) : null;

  const title = pickTitle(rich.fullText, entry.title);
  const description = rich.fullText || entry.description || null;

  const extras: Record<string, unknown> = {};
  if (quotedTweets.length > 0) extras.quotedTweets = quotedTweets;
  if (rich.quoted) extras.quotedTweet = richQuotedExtra(rich.quoted);
  if (rich.card) extras.card = rich.card;
  if (rich.isReply) extras.isReply = true;
  if (rich.replyingTo) extras.replyingTo = rich.replyingTo;

  const capture: Capture = {
    id: entry.postId,
    source: "threads",
    url: entry.url,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(name || handle || avatarUrl
      ? {
          author: {
            ...(name ? { name } : {}),
            ...(handle ? { handle } : {}),
            ...(avatarUrl ? { avatarUrl } : {}),
            ...(rich.author.verified ? { verified: true } : {}),
          },
        }
      : {}),
    ...(publishedAt && Number.isFinite(publishedAt.getTime())
      ? { publishedAt: publishedAt.toISOString() }
      : {}),
    media,
    ...(rich.metrics && Object.keys(rich.metrics).length > 0
      ? { metrics: { ...rich.metrics } }
      : {}),
    ...(Object.keys(extras).length > 0 ? { extras } : {}),
  };

  const rawJson: RawJson = {
    capture,
    extractorId: "threads-saved-seed",
    extractedAt: new Date().toISOString(),
  };

  return {
    rawJson,
    title: title ?? null,
    description: description ?? null,
    author: name ?? (handle ? `@${handle}` : (entry.author ?? null)),
    mediaUrl: media[0]?.url ?? null,
    mediaType: majorityMediaType(
      media.map((m) => (m.type === "video" ? "video" : "image")),
    ),
    publishedAt:
      publishedAt && Number.isFinite(publishedAt.getTime())
        ? publishedAt
        : null,
    lang: null,
  };
}

function richQuotedExtra(quoted: RichThread): Record<string, unknown> {
  return {
    tweetId: quoted.postId,
    url: quoted.url,
    author: {
      ...(quoted.author.name ? { name: quoted.author.name } : {}),
      ...(quoted.author.handle ? { handle: quoted.author.handle } : {}),
      ...(quoted.author.avatarUrl
        ? { avatarUrl: quoted.author.avatarUrl }
        : {}),
    },
    ...(quoted.fullText ? { text: quoted.fullText } : {}),
    ...(quoted.media.length > 0
      ? {
          media: quoted.media.map((m) => ({
            url: m.url,
            type: m.type,
            ...(m.poster ? { posterUrl: m.poster } : {}),
            ...(typeof m.width === "number" ? { width: m.width } : {}),
            ...(typeof m.height === "number" ? { height: m.height } : {}),
            ...(typeof m.durationSec === "number"
              ? { durationSec: m.durationSec }
              : {}),
          })),
        }
      : {}),
  };
}
