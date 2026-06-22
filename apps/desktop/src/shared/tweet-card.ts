import type { Capture, CaptureMedia } from "@pond/schema/raw";

// Normalized shape the TweetCard renders from. Shared by the renderer (preview
// + live card) and the main process (offscreen rasterization for covers), so
// the card always reflects the same data regardless of where it's drawn.
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
}

// Rich quoted-tweet content persisted by the extractor (Phase 3). Older saves
// only carry { tweetId, url }, so every field is optional.
interface QuotedExtra {
  tweetId?: string;
  url?: string;
  author?: { name?: string; handle?: string; avatarUrl?: string };
  text?: string;
  media?: CaptureMedia[];
}

function handleFromUrl(url: string): string | undefined {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
    return seg && /^[A-Za-z0-9_]+$/.test(seg) ? seg : undefined;
  } catch {
    return undefined;
  }
}

// twimg avatar URLs (`/profile_images/`) sometimes leak into media via the
// harvest's og:image fallback. They're never tweet media and 404 once a sizing
// param is appended, so drop them before they render as a broken tile.
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

  // Preferred: the rich quoted-tweet object (Phase 3).
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

  // Fallback: the legacy { tweetId, url } list yields only a handle.
  const list = extras.quotedTweets;
  if (Array.isArray(list) && list[0]) {
    const q = list[0] as { url?: string };
    const handle = q.url ? handleFromUrl(q.url) : undefined;
    if (handle) return { author: { name: handle, handle } };
  }
  return undefined;
}

// Pure adapter from a captured tweet to the card model. Returns null when the
// capture is missing entirely. `fallbackAuthor` is the save's `@handle` string.
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

  const quoted = buildQuoted(
    capture.extras as Record<string, unknown> | undefined,
  );
  if (quoted) data.quoted = quoted;

  // Parent media excludes anything also shown inside the quoted card, since the
  // harvester merges quoted media into the parent capture list.
  const quotedUrls = new Set((quoted?.media ?? []).map((m) => m.url));
  const media = mapMedia(capture.media).filter((m) => !quotedUrls.has(m.url));
  if (media.length > 0) data.media = media;

  if (capture.metrics) {
    const m = capture.metrics;
    const metrics: TweetCardMetrics = {
      ...(typeof m.replies === "number" ? { replies: m.replies } : {}),
      ...(typeof m.retweets === "number" ? { retweets: m.retweets } : {}),
      ...(typeof m.likes === "number" ? { likes: m.likes } : {}),
      ...(typeof m.views === "number" ? { views: m.views } : {}),
      ...(typeof m.bookmarks === "number" ? { bookmarks: m.bookmarks } : {}),
    };
    if (Object.keys(metrics).length > 0) data.metrics = metrics;
  }

  return data;
}
