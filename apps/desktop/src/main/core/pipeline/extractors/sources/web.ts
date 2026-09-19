import type { CaptureMedia } from "@pond/schema/raw";
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

type WebExtras = {
  publisher?: string;
  faviconUrl?: string;
};

import type { Capture, ExtractInput, Extractor } from "../types";

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

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

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

    const faviconUrl = pickString(meta.logo);
    const coverUrl = pickString(meta.image) ?? faviconUrl;
    const media: CaptureMedia[] = coverUrl
      ? [{ url: coverUrl, type: "image" }]
      : [];

    const authorName = pickString(meta.author);
    const author = authorName ? { name: authorName } : undefined;

    const publishedAt = pickString(meta.date);
    const publisher = pickString(meta.publisher);

    const extras: WebExtras = {};
    if (publisher) extras.publisher = publisher;
    if (faviconUrl) extras.faviconUrl = faviconUrl;

    const title = pickString(meta.title);
    const description = pickString(meta.description);
    const capture: Capture = {
      id: canonical,
      source: "web",
      url: canonical,
      media,
    };
    if (title) capture.title = title;
    if (description) capture.description = description;
    if (author) capture.author = author;
    if (publishedAt) capture.publishedAt = publishedAt;
    if (Object.keys(extras).length > 0) capture.extras = extras;
    return capture;
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
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
