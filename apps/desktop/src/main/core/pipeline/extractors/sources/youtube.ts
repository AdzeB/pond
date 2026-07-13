import { TerminalError } from "../errors";
import { fetchHtmlInWindow } from "../helpers";
import type {
  Capture,
  ExtractInput,
  Extractor,
  MediaCandidate,
} from "../types";
import { firstMatch, YOUTUBE_PATTERNS } from "../url-patterns";

export class YouTubeWatchExtractor implements Extractor {
  readonly id = "youtube-watch";
  readonly source = "youtube" as const;
  readonly validUrl = YOUTUBE_PATTERNS;
  readonly cookieDomain = ".youtube.com";
  /** Probed on /account, where the channel handle renders as "@name"; the leading-boundary guard keeps the account email's "@gmail" from matching. */
  readonly probeExpression = `(() => {
        try {
          const m = (document.body?.innerText || '').match(/(^|\\s)@([A-Za-z0-9._-]{3,30})/);
          return m ? m[2] : '';
        } catch { return ''; }
      })()`;

  authCookies(name: string): boolean {
    return (
      name === "LOGIN_INFO" ||
      name === "SID" ||
      name === "__Secure-1PSID" ||
      name === "__Secure-3PSID"
    );
  }

  readonly tests = [
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", id: "dQw4w9WgXcQ" },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const match = firstMatch(input.url, this.validUrl);
    const videoId = match?.[1] ?? null;
    if (!videoId) throw new TerminalError("could not parse youtube id");
    const canonical = `https://www.youtube.com/watch?v=${videoId}`;

    const dom = await fetchHtmlInWindow(canonical, "youtube", videoId);
    const meta = (dom.meta ?? {}) as Record<string, unknown>;

    /** Always emit a video candidate (fetch_video_ytdlp gates on it); fall back to the ytimg thumbnail. */
    const posterUrl =
      typeof dom.mediaUrl === "string" && dom.mediaUrl.length > 0
        ? dom.mediaUrl
        : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const media: MediaCandidate[] = [
      {
        url: canonical,
        type: "video",
        posterUrl,
      },
    ];

    const author = {
      ...(typeof dom.author === "string" ? { name: dom.author } : {}),
      ...(typeof meta.authorUrl === "string"
        ? { profileUrl: meta.authorUrl }
        : {}),
      ...(typeof meta.authorAvatar === "string"
        ? { avatarUrl: meta.authorAvatar }
        : {}),
    };

    const metrics: Record<string, number> = {};
    if (typeof meta.views === "number") metrics.views = meta.views;
    if (typeof meta.likes === "number") metrics.likes = meta.likes;

    const duration =
      typeof meta.durationSec === "number" ? meta.durationSec : undefined;

    return {
      id: videoId,
      source: "youtube",
      url: canonical,
      title: dom.title,
      description: dom.description,
      ...(Object.keys(author).length > 0 ? { author } : {}),
      ...(typeof meta.publishedAt === "string"
        ? { publishedAt: meta.publishedAt }
        : {}),
      ...(typeof dom.lang === "string" ? { lang: dom.lang } : {}),
      media,
      ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
      ...(duration !== undefined ? { duration } : {}),
    };
  }
}
