import { TerminalError } from "../errors";
import { fetchHtmlInWindow } from "../helpers";
import type {
  Capture,
  ExtractInput,
  Extractor,
  MediaCandidate,
} from "../types";
import { firstMatch, REDDIT_PATTERNS } from "../url-patterns";

export class RedditPostExtractor implements Extractor {
  readonly id = "reddit-post";
  readonly source = "reddit" as const;
  readonly validUrl = REDDIT_PATTERNS;
  readonly cookieDomain = ".reddit.com";

  authCookies(name: string): boolean {
    return name === "reddit_session" || name === "token_v2";
  }

  handleFromPath(segments: string[]): string | null {
    if ((segments[0] === "user" || segments[0] === "u") && segments[1]) {
      return segments[1];
    }
    return null;
  }

  readonly tests = [
    {
      url: "https://www.reddit.com/r/pics/comments/abc123/a_nice_photo/",
      id: "abc123",
      profile: { url: "https://www.reddit.com/user/spez/", handle: "spez" },
    },
    { url: "https://redd.it/abc123", id: "abc123" },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const match = firstMatch(input.url, this.validUrl);
    const postId = match?.[1] ?? null;
    if (!postId) throw new TerminalError("could not parse reddit post id");

    /** redd.it short links redirect to the canonical permalink; navigating the original URL lets the scrape window follow the redirect. */
    const canonical = input.url.href;

    const result = await fetchHtmlInWindow(canonical, "reddit", postId);
    const meta = (result.meta ?? {}) as Record<string, unknown>;

    const media: MediaCandidate[] = (result.mediaUrls ?? []).map((m) => ({
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      ...(m.poster ? { posterUrl: m.poster } : {}),
    }));

    const author = {
      ...(typeof meta.authorName === "string" ? { name: meta.authorName } : {}),
      ...(typeof result.author === "string"
        ? { handle: result.author.replace(/^u\//, "").replace(/^@/, "") }
        : {}),
      ...(typeof meta.authorUrl === "string"
        ? { profileUrl: meta.authorUrl }
        : {}),
    };

    const metricsRaw = (meta.metrics ?? {}) as Record<string, unknown>;
    const metrics = pickNumbers(metricsRaw, ["likes", "comments"]);

    const extras: Record<string, unknown> = {
      ...(typeof meta.subreddit === "string"
        ? { subreddit: meta.subreddit }
        : {}),
    };

    return {
      id: postId,
      source: "reddit",
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
