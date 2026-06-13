import { TerminalError } from "../errors";
import { fetchHtmlInWindow } from "../helpers";
import type {
  Capture,
  ExtractInput,
  Extractor,
  MediaCandidate,
} from "../types";
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
            // Filter obvious non-user paths.
            if (['login','signup','signin','about','pricing','settings','explore','search','feed','home','clusters'].includes(handle.toLowerCase())) continue;
            // Prefer a link in the top nav / header.
            const inNav = a.closest('header, nav, [role="navigation"]');
            if (inNav) return handle;
          }
          // Fallback: any plausible match.
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([A-Za-z0-9_-]{2,40})(\\?.*)?$/);
            if (m && !['login','signup','signin','about','pricing','settings','explore','search','feed','home','clusters'].includes(m[1].toLowerCase())) return m[1];
          }
          void host;
          return '';
        } catch { return ''; }
      })()`;

  // cosmos.so uses Supabase/NextAuth-style session tokens. Their cookie name
  // has changed before, so accept the standard auth-token shapes rather than
  // pinning to one literal.
  authCookies(name: string): boolean {
    return (
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
    const canonical = input.url.href;
    const sourceId = input.url.pathname.replace(/\/$/, "").replace(/^\//, "");
    if (!sourceId) throw new TerminalError("could not parse cosmos id");

    const result = await fetchHtmlInWindow(canonical, "cosmos", sourceId);
    const meta = (result.meta ?? {}) as Record<string, unknown>;

    const media: MediaCandidate[] = (result.mediaUrls ?? []).map((m) => ({
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      ...(m.poster ? { posterUrl: m.poster } : {}),
    }));

    const author = {
      ...(typeof result.author === "string"
        ? { name: result.author, handle: result.author.replace(/^@/, "") }
        : {}),
      ...(typeof meta.authorAvatar === "string"
        ? { avatarUrl: meta.authorAvatar }
        : {}),
      ...(typeof meta.authorUrl === "string"
        ? { profileUrl: meta.authorUrl }
        : {}),
    };

    const upstreamUrl =
      typeof meta.upstreamUrl === "string"
        ? meta.upstreamUrl
        : typeof meta.sourceUrl === "string"
          ? meta.sourceUrl
          : undefined;
    const upstream = (() => {
      if (!upstreamUrl) return undefined;
      try {
        return { url: upstreamUrl, host: new URL(upstreamUrl).host };
      } catch {
        return undefined;
      }
    })();

    // Cosmos tiles often wrap iframe embeds (YouTube/Vimeo). The DOM
    // normalizer picks up the poster image but not the underlying video.
    // If we have an upstream URL, synthesize a video candidate so the
    // fetch_video_ytdlp gate fires.
    if (upstream && !media.some((m) => m.type === "video")) {
      media.push({
        url: upstream.url,
        type: "video",
        ...(media[0]?.url ? { posterUrl: media[0].url } : {}),
      });
    }

    return {
      id: sourceId,
      source: "cosmos",
      url: canonical,
      title: result.title,
      description: result.description,
      ...(Object.keys(author).length > 0 ? { author } : {}),
      ...(typeof meta.publishedAt === "string"
        ? { publishedAt: meta.publishedAt }
        : {}),
      ...(typeof result.lang === "string" ? { lang: result.lang } : {}),
      media,
      ...(upstream ? { upstream } : {}),
      ...(meta.tileType || meta.clusters
        ? {
            extras: {
              ...(typeof meta.tileType === "string"
                ? { tileType: meta.tileType }
                : {}),
              ...(meta.clusters ? { clusters: meta.clusters } : {}),
            },
          }
        : {}),
    };
  }
}
