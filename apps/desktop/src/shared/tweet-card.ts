import type { Capture, CaptureMedia } from "@pond/schema/raw";

export interface TweetCardAuthor {
  name: string;
  handle: string;
  avatarUrl?: string;
  verified?: boolean;
}

export interface TweetCardMedia {
  url: string;
  type: "image" | "video";
  posterUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  altText?: string;
}

export interface TweetCardMetrics {
  replies?: number;
  retweets?: number;
  likes?: number;
  views?: number;
  bookmarks?: number;
  shares?: number;
}

export interface TweetCardLink {
  url?: string;
  domain?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  large?: boolean;
}

export interface TweetCardData {
  author: TweetCardAuthor;
  text?: string;
  publishedAt?: string;
  lang?: string;
  isReply?: boolean;
  replyingTo?: string;
  media?: TweetCardMedia[];
  metrics?: TweetCardMetrics;
  quoted?: TweetCardData;
  card?: TweetCardLink;
}

function handleFromUrl(url: string): string | undefined {
  try {
    const first = new URL(url).pathname.split("/").filter(Boolean)[0];
    if (!first) return undefined;
    const handle = first.startsWith("@") ? first.slice(1) : first;
    return /^[A-Za-z0-9._]+$/.test(handle) ? handle : undefined;
  } catch {
    return undefined;
  }
}

function isAvatarUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "pbs.twimg.com" && u.pathname.includes("/profile_images/")
    );
  } catch {
    return false;
  }
}

/** Hidden capture windows cannot load blob: posters harvested from X's <video> element. */
function isRenderableImageUrl(url: string): boolean {
  if (url.startsWith("data:image/")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function mapMedia(
  media: readonly CaptureMedia[] | undefined,
): TweetCardMedia[] {
  if (!media) return [];
  const out: TweetCardMedia[] = [];
  for (const m of media) {
    if (m.type === "link") continue;
    if (isAvatarUrl(m.url)) continue;
    const poster =
      typeof m.posterUrl === "string" && isRenderableImageUrl(m.posterUrl)
        ? m.posterUrl
        : undefined;
    if (m.type === "video") {
      out.push({
        url: m.url,
        type: "video",
        ...(poster ? { posterUrl: poster } : {}),
        ...(typeof m.durationSec === "number"
          ? { durationSec: m.durationSec }
          : {}),
        ...(typeof m.width === "number" ? { width: m.width } : {}),
        ...(typeof m.height === "number" ? { height: m.height } : {}),
      });
      continue;
    }
    if (!isRenderableImageUrl(m.url)) continue;
    out.push({
      url: m.url,
      type: "image",
      ...(typeof m.width === "number" ? { width: m.width } : {}),
      ...(typeof m.height === "number" ? { height: m.height } : {}),
    });
  }
  return out;
}

function buildQuoted(quoted: Capture | undefined): TweetCardData | undefined {
  if (!quoted) return undefined;
  if (!quoted.description && !quoted.author && quoted.media.length === 0) {
    const handle = quoted.url ? handleFromUrl(quoted.url) : undefined;
    if (handle) return { author: { name: handle, handle } };
    return undefined;
  }
  const handle =
    quoted.author?.handle ??
    (quoted.url ? handleFromUrl(quoted.url) : undefined) ??
    "";
  return {
    author: {
      name: quoted.author?.name ?? handle,
      handle,
      ...(quoted.author?.avatarUrl
        ? { avatarUrl: quoted.author.avatarUrl }
        : {}),
    },
    ...(quoted.description ? { text: quoted.description } : {}),
    ...(quoted.media.length > 0 ? { media: mapMedia(quoted.media) } : {}),
  };
}

function buildCard(capture: Capture): TweetCardLink | undefined {
  const c = capture.card;
  if (!c) return undefined;
  const url = typeof c.url === "string" ? c.url : undefined;
  const domain = typeof c.domain === "string" ? c.domain : undefined;
  const title = typeof c.title === "string" ? c.title : undefined;
  const description =
    typeof c.description === "string" ? c.description : undefined;
  const imageUrl = typeof c.imageUrl === "string" ? c.imageUrl : undefined;
  if (!url && !title && !imageUrl) return undefined;
  return {
    ...(url ? { url } : {}),
    ...(domain ? { domain } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(c.large === true ? { large: true } : {}),
  };
}

export function buildTweetCardData(
  capture: Capture | undefined | null,
  fallbackAuthor?: string | null,
): TweetCardData | null {
  if (!capture) return null;

  const author = capture.author ?? {};
  const handle =
    author.handle ??
    (fallbackAuthor ? fallbackAuthor.replace(/^@/, "") : undefined) ??
    "";
  const name = author.name ?? fallbackAuthor ?? handle;

  const data: TweetCardData = {
    author: {
      name,
      handle,
      ...(author.avatarUrl ? { avatarUrl: author.avatarUrl } : {}),
      ...(author.verified ? { verified: true } : {}),
    },
    ...(capture.description ? { text: capture.description } : {}),
    ...(capture.publishedAt ? { publishedAt: capture.publishedAt } : {}),
    ...(capture.lang ? { lang: capture.lang } : {}),
  };

  if (capture.isReply) data.isReply = true;
  if (capture.replyingTo) data.replyingTo = capture.replyingTo;

  const quoted = buildQuoted(capture.quoted);
  if (quoted) data.quoted = quoted;

  const card = buildCard(capture);
  if (card) data.card = card;

  const quotedUrls = new Set((quoted?.media ?? []).map((m) => m.url));
  const media = mapMedia(capture.media).filter((m) => !quotedUrls.has(m.url));
  if (media.length > 0) data.media = media;

  if (capture.metrics) {
    const m = capture.metrics;
    const metrics: TweetCardMetrics = {
      ...(typeof m.replies === "number"
        ? { replies: m.replies }
        : typeof m.comments === "number"
          ? { replies: m.comments }
          : {}),
      ...(typeof m.retweets === "number" ? { retweets: m.retweets } : {}),
      ...(typeof m.likes === "number" ? { likes: m.likes } : {}),
      ...(typeof m.views === "number" ? { views: m.views } : {}),
      ...(typeof m.bookmarks === "number" ? { bookmarks: m.bookmarks } : {}),
      ...(typeof m.shares === "number" ? { shares: m.shares } : {}),
    };
    if (Object.keys(metrics).length > 0) data.metrics = metrics;
  }

  return data;
}
