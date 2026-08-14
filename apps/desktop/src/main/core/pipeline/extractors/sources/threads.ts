import { TerminalError } from "../errors";
import { fetchHtmlInWindow } from "../helpers";
import type {
  Capture,
  ExtractInput,
  Extractor,
  MediaCandidate,
} from "../types";
import { firstMatch, THREADS_PATTERNS } from "../url-patterns";

export class ThreadsPostExtractor implements Extractor {
  readonly id = "threads-post";
  readonly source = "threads" as const;
  readonly validUrl = THREADS_PATTERNS;
  readonly cookieDomain = ".threads.com";
  /** Profile nav / avatar link to /@<handle>; embedded viewer username is the markup-independent fallback. */
  readonly probeExpression = `(() => {
        try {
          const link = document.querySelector('a[href^="/@"] img')?.closest('a') || document.querySelector('a[href^="/@"][role="link"]');
          const href = link?.getAttribute('href') || '';
          const m = href.match(/^\\/@([A-Za-z0-9._]+)/);
          if (m) return m[1];
          const scripts = Array.from(document.scripts).map((s) => s.textContent || '').join('\\n');
          const vm = scripts.match(/"username"\\s*:\\s*"([A-Za-z0-9._]+)"/);
          return vm ? vm[1] : '';
        } catch { return ''; }
      })()`;

  authCookies(name: string): boolean {
    return name === "sessionid";
  }

  handleFromPath(segments: string[]): string | null {
    const first = segments[0];
    if (!first) return null;
    if (first.startsWith("@")) return first.slice(1);
    /** Bare handle for cache validation via `isCachedHandleValid`. */
    if (!["t", "post", "login", "search"].includes(first)) return first;
    return null;
  }

  readonly tests = [
    {
      url: "https://www.threads.com/@zuck/post/C8Example01",
      id: "C8Example01",
      profile: { url: "https://www.threads.com/@zuck", handle: "zuck" },
    },
    {
      url: "https://www.threads.net/@mosseri/post/C8Example02",
      id: "C8Example02",
    },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const match = firstMatch(input.url, this.validUrl);
    const code = match?.[1] ?? null;
    if (!code) throw new TerminalError("could not parse threads post code");

    const handleFromUrl = input.url.pathname.match(/\/@([^/]+)\//)?.[1];
    const canonical = handleFromUrl
      ? `https://www.threads.com/@${handleFromUrl}/post/${code}`
      : `https://www.threads.com/t/${code}`;

    const result = await fetchHtmlInWindow(canonical, "threads", code);
    const meta = (result.meta ?? {}) as Record<string, unknown>;

    /** `meta.media` carries width/height/duration the flat `mediaUrls` list drops. */
    const media = buildMedia(meta.media, result.mediaUrls);

    const handle =
      (typeof result.author === "string"
        ? result.author.replace(/^@/, "")
        : undefined) ?? handleFromUrl;
    const author = {
      ...(typeof meta.authorName === "string" ? { name: meta.authorName } : {}),
      ...(handle ? { handle } : {}),
      ...(typeof meta.authorAvatar === "string"
        ? { avatarUrl: meta.authorAvatar }
        : {}),
      ...(handle ? { profileUrl: `https://www.threads.com/@${handle}` } : {}),
      ...(meta.verified === true ? { verified: true } : {}),
    };

    const metricsRaw = (meta.metrics ?? {}) as Record<string, unknown>;
    const metrics = pickNumbers(metricsRaw, [
      "likes",
      "replies",
      "retweets",
      "quotes",
    ]);

    const permalink = handle
      ? `https://www.threads.com/@${handle}/post/${code}`
      : canonical;

    const quotedRaw = (meta.quotedTweet ?? {}) as Record<string, unknown>;
    const quotedTweets =
      typeof quotedRaw.tweetId === "string" && typeof quotedRaw.url === "string"
        ? [{ tweetId: quotedRaw.tweetId, url: quotedRaw.url }]
        : [];
    const quotedTweet = buildQuotedTweet(quotedRaw);
    const card = buildLinkCard((meta.card ?? {}) as Record<string, unknown>);

    const extras: Record<string, unknown> = {
      ...(quotedTweets.length > 0 ? { quotedTweets } : {}),
      ...(quotedTweet ? { quotedTweet } : {}),
      ...(card ? { card } : {}),
      ...(meta.isReply === true ? { isReply: true } : {}),
      ...(typeof meta.replyingTo === "string"
        ? { replyingTo: meta.replyingTo }
        : {}),
    };

    return {
      id: code,
      source: "threads",
      url: permalink,
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

/** Prefers the dimensioned `meta.media` entries over the flat `mediaUrls` list. */
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
  const source = rich.length > 0 ? rich : (mediaUrls ?? []);
  for (const m of source) {
    const url = (m as { url: string }).url;
    if (seen.has(url)) continue;
    seen.add(url);
    const rec = m as Record<string, unknown>;
    out.push({
      url,
      type: rec.type === "video" ? "video" : "image",
      ...(typeof rec.poster === "string" ? { posterUrl: rec.poster } : {}),
      ...(typeof rec.width === "number" ? { width: rec.width } : {}),
      ...(typeof rec.height === "number" ? { height: rec.height } : {}),
      ...(typeof rec.durationSec === "number"
        ? { durationSec: rec.durationSec }
        : {}),
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
