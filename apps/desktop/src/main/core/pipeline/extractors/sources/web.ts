import metascraper from "metascraper";
import metascraperAuthor from "metascraper-author";
import metascraperDate from "metascraper-date";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperLogoFavicon from "metascraper-logo-favicon";
import metascraperPublisher from "metascraper-publisher";
import metascraperTitle from "metascraper-title";
import metascraperUrl from "metascraper-url";
import { TerminalError, TransientError } from "../errors";
import type {
  Capture,
  ExtractInput,
  Extractor,
  MediaCandidate,
} from "../types";

// Single shared instance; rule bundles are stateless and reused per fetch.
const scrape = metascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperLogoFavicon(),
  metascraperAuthor(),
  metascraperDate(),
  metascraperPublisher(),
  metascraperUrl(),
]);

const FETCH_TIMEOUT_MS = 15_000;

// Browser-like UA so servers that vary markup by client still emit OG tags.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// Catch-all extractor for arbitrary web pages: plain fetch + metascraper for
// title/description/cover. Kept OUT of EXTRACTOR_LIST so it never shadows the
// source-specific extractors; index.ts wires it in as the explicit fallback.
export class WebPageExtractor implements Extractor {
  readonly id = "web-page";
  readonly source = "web" as const;
  readonly validUrl: readonly RegExp[] = [];
  readonly cookieDomain = null;

  authCookies(): boolean {
    return false;
  }

  suitable(url: URL): boolean {
    return url.protocol === "http:" || url.protocol === "https:";
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const html = await fetchHtml(input.url.href);
    const meta = await scrape({ url: input.url.href, html });

    const canonical = pickString(meta.url) ?? input.url.href;

    const coverUrl = pickString(meta.image) ?? pickString(meta.logo);
    const media: MediaCandidate[] = coverUrl
      ? [{ url: coverUrl, type: "image" }]
      : [];

    const authorName = pickString(meta.author);
    const author = authorName ? { name: authorName } : undefined;

    const publishedAt = pickString(meta.date);
    const publisher = pickString(meta.publisher);

    return {
      id: canonical,
      source: "web",
      url: canonical,
      ...(pickString(meta.title) ? { title: pickString(meta.title) } : {}),
      ...(pickString(meta.description)
        ? { description: pickString(meta.description) }
        : {}),
      ...(author ? { author } : {}),
      ...(publishedAt ? { publishedAt } : {}),
      media,
      ...(publisher ? { extras: { publisher } } : {}),
    };
  }
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch (err) {
    throw new TransientError(
      `web fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // 4xx is unlikely to recover; 5xx may. Treat 5xx/429 as transient.
    if (res.status >= 500 || res.status === 429) {
      throw new TransientError(`web fetch ${res.status}`);
    }
    throw new TerminalError(`web fetch ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !/text\/html|xml|xhtml/i.test(contentType)) {
    throw new TerminalError(`web fetch non-html content-type: ${contentType}`);
  }

  const text = await res.text();
  if (!text.trim()) throw new TerminalError("web fetch returned empty body");
  return text;
}

function pickString(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
