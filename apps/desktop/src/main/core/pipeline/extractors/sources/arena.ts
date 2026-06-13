import { fetchArenaCapture } from "../../../refresh/harvest/arena/api";
import { TerminalError } from "../errors";
import type { Capture, ExtractInput, Extractor } from "../types";
import { ARENA_PATTERNS, firstMatch } from "../url-patterns";

// Thin wrapper over `fetchArenaCapture` for the extractor registry.
export class ArenaBlockExtractor implements Extractor {
  readonly id = "arena-block";
  readonly source = "arena" as const;
  readonly validUrl = ARENA_PATTERNS;
  readonly cookieDomain = ".are.na";
  // Accept iron-session and legacy Rails cookies; cf_clearance tolerated for first sync.
  readonly probeExpression = `(() => {
        try {
          // Are.na's user nav has a "Profile" link to /<slug>.
          const links = Array.from(document.querySelectorAll('a[href^="/"]'));
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([a-z0-9-]{2,60})(\\/?$|\\?.*$)/i);
            if (!m) continue;
            const slug = m[1];
            if (['about','blog','log-in','login','sign-up','signup','channels','search','explore','pricing','jobs','privacy','terms','team','press','help','support','settings'].includes(slug.toLowerCase())) continue;
            return slug;
          }
          return '';
        } catch { return ''; }
      })()`;

  authCookies(name: string): boolean {
    return (
      name === "sander-iron-session" ||
      name === "_arena_session" ||
      name === "remember_user_token" ||
      name === "cf_clearance"
    );
  }

  handleFromPath(segments: string[]): string | null {
    return segments[0] ?? null;
  }

  readonly tests = [
    {
      url: "https://www.are.na/block/12345",
      id: "12345",
      profile: { url: "https://www.are.na/some-user", handle: "some-user" },
    },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const match = firstMatch(input.url, this.validUrl);
    const blockId = match?.[1] ?? null;
    if (!blockId) throw new TerminalError("could not parse arena block id");

    const result = await fetchArenaCapture({ sourceId: blockId });
    if (!result.ok) throw new TerminalError(`arena api: ${result.reason}`);
    return result.capture;
  }
}
