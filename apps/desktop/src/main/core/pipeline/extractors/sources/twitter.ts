import { TerminalError } from "../errors";
import { fetchHtmlInWindow } from "../helpers";
import type {
  Capture,
  ExtractInput,
  Extractor,
  MediaCandidate,
} from "../types";
import { firstMatch, TWITTER_PATTERNS } from "../url-patterns";

export class TwitterTweetExtractor implements Extractor {
  readonly id = "twitter-tweet";
  readonly source = "twitter" as const;
  readonly validUrl = TWITTER_PATTERNS;
  readonly cookieDomain = ".x.com";

  authCookies(name: string): boolean {
    return name === "auth_token";
  }

  readonly tests = [{ url: "https://x.com/jack/status/20", id: "20" }];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const match = firstMatch(input.url, this.validUrl);
    const tweetId = match?.[1] ?? null;
    if (!tweetId) throw new TerminalError("could not parse tweet id");

    const canonical = `https://x.com/i/web/status/${tweetId}`;
    const result = await fetchHtmlInWindow(canonical, "twitter", tweetId);
    const meta = (result.meta ?? {}) as Record<string, unknown>;

    // `meta.media` carries width/height/duration harvested from the DOM, which
    // the flat `mediaUrls` list drops; prefer it so single videos can size to
    // their real aspect ratio. Fall back to `mediaUrls` when it's absent.
    const media = buildMedia(meta.media, result.mediaUrls);

    const author = {
      ...(typeof meta.authorName === "string" ? { name: meta.authorName } : {}),
      ...(typeof result.author === "string"
        ? { handle: result.author.replace(/^@/, "") }
        : {}),
      ...(typeof meta.authorAvatar === "string"
        ? { avatarUrl: meta.authorAvatar }
        : {}),
      ...(typeof meta.authorUrl === "string"
        ? { profileUrl: meta.authorUrl }
        : {}),
      ...(meta.verified === true ? { verified: true } : {}),
    };

    const metricsRaw = (meta.metrics ?? {}) as Record<string, unknown>;
    const metrics = pickNumbers(metricsRaw, [
      "likes",
      "retweets",
      "replies",
      "quotes",
      "views",
      "bookmarks",
    ]);

    // DOM renders only one quote level; record it, the walker discovers deeper ones live.
    const quotedRaw = (meta.quotedTweet ?? {}) as Record<string, unknown>;
    const quotedTweets =
      typeof quotedRaw.tweetId === "string" && typeof quotedRaw.url === "string"
        ? [{ tweetId: quotedRaw.tweetId, url: quotedRaw.url }]
        : [];

    // Rich quoted content so the native card can render the nested quote inline
    // instead of a separate screenshot.
    const quotedTweet = buildQuotedTweet(quotedRaw);

    // Link-card embed (the linked page's OG preview X renders for summary cards).
    const card = buildLinkCard((meta.card ?? {}) as Record<string, unknown>);

    const extras: Record<string, unknown> = {
      ...(typeof meta.conversationId === "string"
        ? { conversationId: meta.conversationId }
        : {}),
      ...(quotedTweets.length > 0 ? { quotedTweets } : {}),
      ...(quotedTweet ? { quotedTweet } : {}),
      ...(card ? { card } : {}),
    };

    return {
      id: tweetId,
      source: "twitter",
      url: canonical,
      title: result.title,
      description: result.description,
      ...(Object.keys(author).length > 0 ? { author } : {}),
      ...(typeof meta.publishedAt === "string"
        ? { publishedAt: meta.publishedAt }
        : {}),
      ...(typeof result.lang === "string" ? { lang: result.lang } : {}),
      media,
      ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
      ...(Object.keys(extras).length > 0 ? { extras } : {}),
    };
  }
}

interface QuotedTweetExtra {
  tweetId?: string;
  url?: string;
  author?: { name?: string; handle?: string; avatarUrl?: string };
  text?: string;
  media?: MediaCandidate[];
}

// Shapes the harvested quote DOM into the rich extra the card consumes. Returns
// undefined when there's nothing renderable (no text, author, or media).
function buildQuotedTweet(
  raw: Record<string, unknown>,
): QuotedTweetExtra | undefined {
  const handle =
    typeof raw.author === "string" ? raw.author.replace(/^@/, "") : undefined;
  const name = typeof raw.authorName === "string" ? raw.authorName : undefined;
  const avatarUrl =
    typeof raw.authorAvatar === "string" ? raw.authorAvatar : undefined;
  const text = typeof raw.text === "string" ? raw.text : undefined;
  const media: MediaCandidate[] = Array.isArray(raw.media)
    ? (raw.media as Array<Record<string, unknown>>)
        .filter((m) => typeof m.url === "string")
        .map((m) => ({
          url: m.url as string,
          type: m.type === "video" ? "video" : "image",
          ...(typeof m.poster === "string" ? { posterUrl: m.poster } : {}),
          ...(typeof m.width === "number" ? { width: m.width } : {}),
          ...(typeof m.height === "number" ? { height: m.height } : {}),
          ...(typeof m.durationSec === "number"
            ? { durationSec: m.durationSec }
            : {}),
        }))
    : [];

  const author =
    handle || name || avatarUrl
      ? {
          ...(name ? { name } : {}),
          ...(handle ? { handle } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
        }
      : undefined;

  if (!author && !text && media.length === 0) return undefined;

  return {
    ...(typeof raw.tweetId === "string" ? { tweetId: raw.tweetId } : {}),
    ...(typeof raw.url === "string" ? { url: raw.url } : {}),
    ...(author ? { author } : {}),
    ...(text ? { text } : {}),
    ...(media.length > 0 ? { media } : {}),
  };
}

interface LinkCardExtra {
  url?: string;
  domain?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  large?: boolean;
}

// Shapes the scraped card DOM into the link-card extra the card renders. Returns
// undefined when there's nothing renderable (no url, title, or image).
function buildLinkCard(
  raw: Record<string, unknown>,
): LinkCardExtra | undefined {
  const url = typeof raw.url === "string" ? raw.url : undefined;
  const domain = typeof raw.domain === "string" ? raw.domain : undefined;
  const title = typeof raw.title === "string" ? raw.title : undefined;
  const description =
    typeof raw.description === "string" ? raw.description : undefined;
  const imageUrl = typeof raw.imageUrl === "string" ? raw.imageUrl : undefined;
  const large = raw.large === true;

  if (!url && !title && !imageUrl) return undefined;

  return {
    ...(url ? { url } : {}),
    ...(domain ? { domain } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(large ? { large } : {}),
  };
}

// Shapes captured media into candidates, preferring the dimensioned
// `meta.media` entries and falling back to the flat `mediaUrls` list. Dedupes
// by url so the parent/quote passes don't double-count a shared poster.
function buildMedia(
  metaMedia: unknown,
  mediaUrls: Array<{ url: string; type?: string; poster?: string }> | undefined,
): MediaCandidate[] {
  const rich = Array.isArray(metaMedia)
    ? (metaMedia as Array<Record<string, unknown>>).filter(
        (m) => typeof m.url === "string",
      )
    : [];
  const out: MediaCandidate[] = [];
  const seen = new Set<string>();
  if (rich.length > 0) {
    for (const m of rich) {
      const url = m.url as string;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        type: m.type === "video" ? "video" : "image",
        ...(typeof m.poster === "string" ? { posterUrl: m.poster } : {}),
        ...(typeof m.width === "number" ? { width: m.width } : {}),
        ...(typeof m.height === "number" ? { height: m.height } : {}),
        ...(typeof m.durationSec === "number"
          ? { durationSec: m.durationSec }
          : {}),
      });
    }
    return out;
  }
  for (const m of mediaUrls ?? []) {
    if (seen.has(m.url)) continue;
    seen.add(m.url);
    out.push({
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      ...(m.poster ? { posterUrl: m.poster } : {}),
    });
  }
  return out;
}

function pickNumbers<K extends string>(
  obj: Record<string, unknown>,
  keys: readonly K[],
): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return out;
}
