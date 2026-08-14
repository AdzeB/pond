import type { Capture, CaptureMedia } from "@pond/schema/raw";

/** Normalized shape the TweetCard renders from; shared by the renderer and main so the card matches wherever it's drawn. */
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

/** The linked page's OG preview X renders below a tweet; `url` is the destination, the rest is best-effort. */
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

/** Rich quoted-tweet content persisted by the extractor; older saves only carry { tweetId, url }, so every field is optional. */
interface QuotedExtra {
  tweetId?: string;
  url?: string;
  author?: { name?: string; handle?: string; avatarUrl?: string };
  text?: string;
  media?: CaptureMedia[];
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

/** twimg avatar URLs leak into media via the og:image fallback and 404 once a sizing param is appended; drop them before they render broken. */
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

function mapMedia(
  media: readonly CaptureMedia[] | undefined,
): TweetCardMedia[] {
  if (!media) return [];
  const out: TweetCardMedia[] = [];
  for (const m of media) {
    if (m.type === "link") continue;
    if (isAvatarUrl(m.url)) continue;
    out.push({
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      ...(m.posterUrl ? { posterUrl: m.posterUrl } : {}),
      ...(typeof m.durationSec === "number"
        ? { durationSec: m.durationSec }
        : {}),
      ...(typeof m.width === "number" ? { width: m.width } : {}),
      ...(typeof m.height === "number" ? { height: m.height } : {}),
    });
  }
  return out;
}

function buildQuoted(
  extras: Record<string, unknown> | undefined,
): TweetCardData | undefined {
  if (!extras) return undefined;

  const rich = extras.quotedTweet as QuotedExtra | undefined;
  if (rich && (rich.text || rich.author || rich.media)) {
    const handle =
      rich.author?.handle ??
      (rich.url ? handleFromUrl(rich.url) : undefined) ??
      "";
    return {
      author: {
        name: rich.author?.name ?? handle,
        handle,
        ...(rich.author?.avatarUrl ? { avatarUrl: rich.author.avatarUrl } : {}),
      },
      ...(rich.text ? { text: rich.text } : {}),
      ...(rich.media && rich.media.length > 0
        ? { media: mapMedia(rich.media) }
        : {}),
    };
  }

  /** Legacy { tweetId, url } saves yield only a handle. */
  const list = extras.quotedTweets;
  if (Array.isArray(list) && list[0]) {
    const q = list[0] as { url?: string };
    const handle = q.url ? handleFromUrl(q.url) : undefined;
    if (handle) return { author: { name: handle, handle } };
  }
  return undefined;
}

function buildCard(
  extras: Record<string, unknown> | undefined,
): TweetCardLink | undefined {
  if (!extras) return undefined;
  const raw = extras.card;
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Partial<TweetCardLink>;
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

/** Adapts a captured tweet to the card model; `fallbackAuthor` is the save's `@handle` string. */
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

  const extras = capture.extras as Record<string, unknown> | undefined;
  if (extras?.isReply === true) data.isReply = true;
  if (typeof extras?.replyingTo === "string")
    data.replyingTo = extras.replyingTo;

  const quoted = buildQuoted(extras);
  if (quoted) data.quoted = quoted;

  const card = buildCard(extras);
  if (card) data.card = card;

  /** The harvester merges quoted media into the parent capture list, so exclude anything already shown in the quoted card. */
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
