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
import {
  browserUserAgent,
  NAV_TIMEOUT_MS,
} from "../../../refresh/harvest-window/constants";
import { navigateWithTimeout } from "../../../refresh/harvest-window/navigation";
import { leaseWindow } from "../../../refresh/harvest-window/pool";
import { sleep } from "../../../refresh/harvest-window/util";
import { TerminalError, TransientError } from "../errors";
import type { Capture, ExtractInput, Extractor } from "../types";

type WebExtras = {
  publisher?: string;
  faviconUrl?: string;
};

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
const RENDER_SETTLE_MS = 1_500;
const RENDER_READ_TIMEOUT_MS = 10_000;

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
    const html =
      (await fetchHtml(input.url.href)) ??
      (await renderHtml(input.url.href, input.signal));
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

/** Resolves null on 403: bot walls fingerprint the TLS handshake, so only a real browser gets through. */
async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": browserUserAgent(),
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

  if (res.status === 403) return null;
  assertPageStatus(res.status, "web fetch");

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !/text\/html|xml|xhtml/i.test(contentType)) {
    throw new TerminalError(`web fetch non-html content-type: ${contentType}`);
  }

  const text = await res.text();
  if (!text.trim()) throw new TerminalError("web fetch returned empty body");
  return text;
}

async function renderHtml(url: string, signal?: AbortSignal): Promise<string> {
  const lease = await leaseWindow("web", { signal });
  try {
    const wc = lease.win.webContents;
    let status = 0;
    const onNavigate = (_e: Electron.Event, _url: string, code: number) => {
      status = code;
    };
    wc.on("did-navigate", onNavigate);
    let loaded: boolean;
    try {
      loaded = await navigateWithTimeout(lease.win, url, NAV_TIMEOUT_MS);
    } finally {
      wc.off("did-navigate", onNavigate);
    }
    if (!loaded) throw new TransientError("web render: navigation failed");
    assertPageStatus(status, "web render");
    await sleep(RENDER_SETTLE_MS);
    const html: unknown = await Promise.race([
      wc.executeJavaScript("document.documentElement.outerHTML", true),
      sleep(RENDER_READ_TIMEOUT_MS).then(() => null),
    ]);
    if (html === null) throw new TransientError("web render: read timed out");
    if (typeof html !== "string" || !html.trim()) {
      throw new TerminalError("web render returned empty document");
    }
    return html;
  } finally {
    lease.release();
  }
}

function assertPageStatus(status: number, label: string): void {
  if (status < 400) return;
  if (status >= 500 || status === 429) {
    throw new TransientError(`${label} ${status}`);
  }
  throw new TerminalError(`${label} ${status}`);
}

function pickString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
