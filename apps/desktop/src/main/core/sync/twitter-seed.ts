import type { MediaType } from "@pond/schema/db";
import { majorityMediaType } from "@pond/schema/media-type";
import type { RawJson } from "@pond/schema/raw";
import { walkCaptureMedia } from "@pond/schema/raw";
import {
  captureFromTweetShaped,
  draftFromRichPost,
} from "../capture/tweet-shaped";
import { pickTitle } from "../refresh/harvest/lib/title";
import type { BookmarksEntry, RichTweet } from "../refresh/harvest/twitter";

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

export function buildTwitterBookmarkSeed(
  entry: BookmarksEntry,
): SaveSeed | null {
  const rich = entry.rich;
  if (!rich) return null;

  const publishedAt = readLegacyCreatedAt(rich.raw);
  const capture = captureFromTweetShaped(
    draftFromRichPost({
      source: "twitter",
      id: entry.tweetId,
      url: entry.url,
      text: rich.fullText,
      author: {
        handle:
          rich.author.handle ||
          (entry.author ? entry.author.replace(/^@/, "") : ""),
        name: rich.author.name || rich.author.handle,
        ...(rich.author.avatarUrl ? { avatarUrl: rich.author.avatarUrl } : {}),
      },
      media: rich.media,
      metrics: rich.metrics,
      ...(rich.quoted ? { quoted: richQuoted(rich.quoted) } : {}),
      ...(rich.card ? { card: rich.card } : {}),
      ...(publishedAt ? { publishedAt: publishedAt.toISOString() } : {}),
    }),
  );

  const handle = capture.author?.handle;
  const name = capture.author?.name;
  const media = walkCaptureMedia(capture);
  const title = capture.title ?? pickTitle(rich.fullText, entry.title);

  const rawJson: RawJson = {
    capture,
    extractorId: "twitter-bookmark-seed",
    extractedAt: new Date().toISOString(),
  };

  return {
    rawJson,
    title: title ?? null,
    description: capture.description ?? null,
    author: name ?? (handle ? `@${handle}` : (entry.author ?? null)),
    mediaUrl: capture.media[0]?.url ?? media[0]?.url ?? null,
    mediaType: majorityMediaType(
      capture.media.map((m) => (m.type === "video" ? "video" : "image")),
    ),
    publishedAt,
    lang: null,
  };
}

function richQuoted(
  quoted: RichTweet,
): Parameters<typeof draftFromRichPost>[0] {
  return {
    source: "twitter",
    id: quoted.tweetId,
    url: quoted.url,
    text: quoted.fullText,
    author: {
      handle: quoted.author.handle,
      name: quoted.author.name,
      ...(quoted.author.avatarUrl
        ? { avatarUrl: quoted.author.avatarUrl }
        : {}),
    },
    media: quoted.media,
    metrics: quoted.metrics,
    ...(quoted.quoted ? { quoted: richQuoted(quoted.quoted) } : {}),
    ...(quoted.card ? { card: quoted.card } : {}),
  };
}

function readLegacyCreatedAt(raw: unknown): Date | null {
  const legacy = (raw as { legacy?: { created_at?: unknown } } | null)?.legacy;
  const createdAt = legacy?.created_at;
  if (typeof createdAt !== "string") return null;
  const ms = Date.parse(createdAt);
  return Number.isFinite(ms) ? new Date(ms) : null;
}
