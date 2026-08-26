import { captureFromSource } from "../../../refresh/harvest/capture";
import { TerminalError } from "../errors";
import type { Capture, ExtractInput, Extractor } from "../types";
import { firstMatch, YOUTUBE_PATTERNS } from "../url-patterns";

export class YouTubeWatchExtractor implements Extractor {
  readonly id = "youtube-watch";
  readonly source = "youtube" as const;
  readonly validUrl = YOUTUBE_PATTERNS;
  readonly cookieDomain = ".youtube.com";
  readonly probeExpression = `(() => {
        try {
          const m = (document.body?.innerText || '').match(/(^|\\s)@([A-Za-z0-9._-]{3,30})/);
          return m ? m[2] : '';
        } catch { return ''; }
      })()`;

  authCookies(name: string): boolean {
    /** SID / PSID appear during Google SSO before YouTube itself is signed in. */
    return name === "LOGIN_INFO";
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
    return captureFromSource({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      source: "youtube",
      sourceId: videoId,
    });
  }
}
