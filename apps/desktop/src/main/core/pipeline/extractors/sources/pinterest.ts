import { fetchPinterestCapture } from "../../../refresh/harvest/pinterest/api";
import { TerminalError } from "../errors";
import type { Capture, ExtractInput, Extractor } from "../types";
import { firstMatch, PINTEREST_PATTERNS } from "../url-patterns";

export class PinterestPinExtractor implements Extractor {
  readonly id = "pinterest-pin";
  readonly source = "pinterest" as const;
  readonly validUrl = PINTEREST_PATTERNS;
  readonly cookieDomain = ".pinterest.com";
  /** The __PWS_DATA__ state blob carries the signed-in user; the header profile link is the markup fallback. */
  readonly probeExpression = `(() => {
        try {
          const pws = document.getElementById('__PWS_DATA__');
          if (pws) {
            const data = JSON.parse(pws.textContent || '{}');
            const u = data?.props?.context?.user?.username;
            if (typeof u === 'string' && u) return u;
          }
          const a = document.querySelector('a[data-test-id="header-profile"]');
          const m = (a?.getAttribute('href') || '').match(/^\\/([A-Za-z0-9_]+)\\/?$/);
          return m ? m[1] : '';
        } catch { return ''; }
      })()`;

  authCookies(name: string): boolean {
    return name === "_pinterest_sess" || name === "_auth";
  }

  handleFromPath(segments: string[]): string | null {
    return segments[0] ?? null;
  }

  readonly tests = [
    {
      url: "https://www.pinterest.com/pin/12345/",
      id: "12345",
      profile: {
        url: "https://www.pinterest.com/someuser/",
        handle: "someuser",
      },
    },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const match = firstMatch(input.url, this.validUrl);
    const pinId = match?.[1] ?? null;
    if (!pinId) throw new TerminalError("could not parse pinterest id");

    const result = await fetchPinterestCapture({ sourceId: pinId });
    if (!result.ok)
      throw new TerminalError(`pinterest relay: ${result.reason}`);
    return result.capture;
  }
}
