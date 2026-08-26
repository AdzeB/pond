import { captureFromSource } from "../../../refresh/harvest/capture";
import { TerminalError } from "../errors";
import type { Capture, ExtractInput, Extractor } from "../types";
import { firstMatch, TIKTOK_PATTERNS } from "../url-patterns";

export class TikTokVideoExtractor implements Extractor {
  readonly id = "tiktok-video";
  readonly source = "tiktok" as const;
  readonly validUrl = TIKTOK_PATTERNS;
  readonly cookieDomain = ".tiktok.com";
  /** The side-nav "Profile" link points to /@<handle> when signed in; data-e2e is stable and avoids matching creator links in the feed. */
  readonly probeExpression = `(() => {
        try {
          const nav = document.querySelector('a[data-e2e="nav-profile"]');
          const href = nav?.getAttribute('href') || '';
          const m = href.match(/^\\/@([A-Za-z0-9._-]+)/);
          if (m) return m[1];
          return '';
        } catch { return ''; }
      })()`;

  authCookies(name: string): boolean {
    return name === "sessionid" || name === "sid_tt";
  }

  handleFromPath(segments: string[]): string | null {
    const handle = segments[0];
    return handle?.startsWith("@") ? handle.slice(1) : (handle ?? null);
  }

  readonly tests = [
    {
      url: "https://www.tiktok.com/@scout2015/video/6718335390845095173",
      id: "6718335390845095173",
      profile: {
        url: "https://www.tiktok.com/@scout2015",
        handle: "scout2015",
      },
    },
    {
      url: "https://www.tiktok.com/video/6718335390845095173",
      id: "6718335390845095173",
    },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const canonical = input.url.href;
    const match = firstMatch(input.url, this.validUrl);
    const tiktokId = match?.[1] ?? canonical;
    if (!tiktokId) throw new TerminalError("could not parse tiktok id");
    return captureFromSource({
      url: canonical,
      source: "tiktok",
      sourceId: tiktokId,
    });
  }
}
