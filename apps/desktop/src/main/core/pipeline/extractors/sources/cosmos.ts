import { sourceIdFromUrl } from "@pond/schema/sources";
import { captureFromSource } from "../../../refresh/harvest/capture";
import { TerminalError } from "../errors";
import type { Capture, ExtractInput, Extractor } from "../types";
import { COSMOS_PATTERNS } from "../url-patterns";

export class CosmosTileExtractor implements Extractor {
  readonly id = "cosmos-tile";
  readonly source = "cosmos" as const;
  readonly validUrl = COSMOS_PATTERNS;
  readonly cookieDomain = ".cosmos.so";
  readonly probeExpression = `(() => {
        try {
          const host = location.hostname.replace(/^www\\./, '');
          const links = Array.from(document.querySelectorAll('a[href^="/"]'));
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([A-Za-z0-9_-]{2,40})(\\?.*)?$/);
            if (!m) continue;
            const handle = m[1];
            if (['login','signup','signin','about','pricing','settings','explore','search','feed','home','clusters'].includes(handle.toLowerCase())) continue;
            const inNav = a.closest('header, nav, [role="navigation"]');
            if (inNav) return handle;
          }
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([A-Za-z0-9_-]{2,40})(\\?.*)?$/);
            if (m && !['login','signup','signin','about','pricing','settings','explore','search','feed','home','clusters'].includes(m[1].toLowerCase())) return m[1];
          }
          void host;
          return '';
        } catch { return ''; }
      })()`;

  /** Cosmos auth uses `csms_*` JWTs; the other shapes are accepted because the cookie name isn't stable. */
  authCookies(name: string): boolean {
    return (
      name === "csms_accessToken" ||
      name === "csms_refreshToken" ||
      /^sb-[a-z0-9-]+-auth-token(\.\d+)?$/.test(name) ||
      name === "__Secure-next-auth.session-token" ||
      name === "next-auth.session-token" ||
      name === "cosmos.session-token"
    );
  }

  readonly tests = [
    { url: "https://www.cosmos.so/jane/cluster-1", id: "jane/cluster-1" },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const sourceId = sourceIdFromUrl("cosmos", input.url.href);
    if (!sourceId) throw new TerminalError("could not parse cosmos id");
    return captureFromSource({
      url: input.url.href,
      source: "cosmos",
      sourceId,
    });
  }
}
