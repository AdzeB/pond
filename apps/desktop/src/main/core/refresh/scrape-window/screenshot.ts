import type { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";
import { adapt, buildExpression } from "../harvest/twitter";
import type { ScrapedHarvest } from "../harvest/types";
import { NAV_TIMEOUT_MS } from "./constants";
import { looksLikeAuthWall, navigateWithTimeout } from "./navigation";
import { leaseWindow } from "./pool";
import { sleep } from "./util";

export interface TweetScreenshotArgs {
  url: string;
  sourceId: string;
  // Forces color scheme; defaults to "dark" for callers predating dual-theme.
  colorScheme?: "light" | "dark";
  // Also harvest media off the loaded page; used by the quote walker.
  harvestMedia?: boolean;
}

export interface TweetScreenshotResult {
  ok: boolean;
  png?: { bytes: Buffer; width: number; height: number };
  reason?: "navigate_failed" | "auth_required" | "no_article" | "timeout";
  // Quoted tweet's canonical URL, for walking the quote chain.
  quotedUrl?: string;
  // Media harvested off the page when `harvestMedia` was requested.
  media?: ScrapedHarvest["mediaUrls"];
}

// Padding around the card in CSS pixels; scaled by the device factor.
const SCREENSHOT_PADDING_CSS = 24;

const SCREENSHOT_ARTICLE_TIMEOUT_MS = 12_000;

// Override DPR via CDP so captures stay sharp regardless of host display.
const CAPTURE_DEVICE_SCALE_FACTOR = 3;

// Bottom padding so lazy-loaded media in the last row isn't clipped.
const SCREENSHOT_VERTICAL_PADDING = 40;

// Hard cap on hidden-window height; anything beyond is cropped (rare).
const SCREENSHOT_MAX_HEIGHT = 8192;

// Captures the tweet's <article> from a hidden window; returns ok:false on any miss.
export async function screenshotTweet(
  args: TweetScreenshotArgs,
): Promise<TweetScreenshotResult> {
  const colorScheme = args.colorScheme ?? "dark";
  const lease = await leaseWindow("twitter");
  // Emulate color scheme before navigation: X reads prefers-color-scheme once on mount.
  let restoreEmulation: (() => Promise<void>) | null = null;
  try {
    restoreEmulation = await emulateColorScheme(lease.win, colorScheme);
    const navOk = await navigateWithTimeout(
      lease.win,
      args.url,
      NAV_TIMEOUT_MS,
    );
    if (!navOk) {
      log.warn("[pond screenshot:tweet] navigate failed", args.url);
      return { ok: false, reason: "navigate_failed" };
    }

    if (looksLikeAuthWall(lease.win.webContents.getURL())) {
      log.info("[pond screenshot:tweet] auth wall hit", args.url);
      return { ok: false, reason: "auth_required" };
    }

    // Pin html background to the scheme so rect rounding doesn't leak edge color.
    const htmlBg = colorScheme === "light" ? "#fff" : "#000";
    // Hide "View quotes" and strip article borders so a divider can't leak into the trim.
    await lease.win.webContents
      .insertCSS(
        `[data-testid="BottomBar"], [data-testid="bottomBar"], [data-testid="login"] { display: none !important; }
         a[href$="/quotes"], a[href$="/retweets/with_comments"] { display: none !important; }
         article { border: 0 !important; }
         html { color-scheme: ${colorScheme}; background: ${htmlBg} !important; }`,
      )
      .catch(() => {});

    const initial = await readArticleRect(lease.win, args.sourceId);
    if (!initial) {
      log.info("[pond screenshot:tweet] no article", args.url);
      return { ok: false, reason: "no_article" };
    }

    // Resize to fit the whole article (capturePage crops overflow), then re-measure.
    const [contentWidthRaw, originalContentHeightRaw] =
      lease.win.getContentSize();
    const contentWidth = contentWidthRaw ?? 1280;
    const originalContentHeight = originalContentHeightRaw ?? 1024;
    const requiredHeight = Math.ceil(
      initial.y + initial.height + SCREENSHOT_VERTICAL_PADDING,
    );
    let rect = initial;
    let resized = false;
    if (requiredHeight > originalContentHeight) {
      const target = Math.min(requiredHeight, SCREENSHOT_MAX_HEIGHT);
      lease.win.setContentSize(contentWidth, target);
      resized = true;
      await sleep(400);
      const remeasured = await readArticleRect(lease.win, args.sourceId);
      if (remeasured) rect = remeasured;
    }

    try {
      const shot = await withDeviceScaleFactor(
        lease.win,
        CAPTURE_DEVICE_SCALE_FACTOR,
        async () => {
          const image = await lease.win.webContents.capturePage({
            x: Math.max(0, Math.floor(rect.x)),
            y: Math.max(0, Math.floor(rect.y)),
            width: Math.max(1, Math.ceil(rect.width)),
            height: Math.max(1, Math.ceil(rect.height)),
          });
          const rawBytes = image.toPNG();
          const size = image.getSize();
          if (
            rawBytes.byteLength === 0 ||
            size.width === 0 ||
            size.height === 0
          ) {
            log.warn("[pond screenshot:tweet] empty capture", args.url);
            return { ok: false, reason: "no_article" } as const;
          }
          const padded = await padScreenshot(rawBytes, size, colorScheme);
          return {
            ok: true,
            png: padded,
            ...(rect.quotedUrl ? { quotedUrl: rect.quotedUrl } : {}),
          } as const;
        },
      );

      if (shot.ok && args.harvestMedia) {
        const media = await harvestPageMedia(lease.win, args.sourceId);
        if (media && media.length > 0) return { ...shot, media };
      }
      return shot;
    } finally {
      if (resized) {
        try {
          lease.win.setContentSize(contentWidth, originalContentHeight);
        } catch {
          /* window may have been destroyed mid-capture; pool drops it */
        }
      }
    }
  } catch (err) {
    log.warn("[pond screenshot:tweet] unexpected error", args.url, err);
    return { ok: false, reason: "no_article" };
  } finally {
    if (restoreEmulation) await restoreEmulation().catch(() => {});
    lease.release();
  }
}

// Harvest media off the already-loaded page; best-effort, returns undefined on failure.
async function harvestPageMedia(
  win: BrowserWindow,
  tweetId: string,
): Promise<ScrapedHarvest["mediaUrls"]> {
  try {
    const raw = await Promise.race([
      win.webContents.executeJavaScript(buildExpression(tweetId), true),
      sleep(SCREENSHOT_ARTICLE_TIMEOUT_MS).then(() => null),
    ]);
    const harvested = adapt(raw);
    return harvested?.mediaUrls;
  } catch (err) {
    log.warn("[pond screenshot:tweet] media harvest failed", err);
    return undefined;
  }
}

// Wrap the card in scheme-colored padding, scaled to the capture device factor.
async function padScreenshot(
  bytes: Buffer,
  raw: { width: number; height: number },
  scheme: "light" | "dark",
): Promise<{ bytes: Buffer; width: number; height: number }> {
  const pad = SCREENSHOT_PADDING_CSS * CAPTURE_DEVICE_SCALE_FACTOR;
  const background =
    scheme === "light"
      ? { r: 255, g: 255, b: 255, alpha: 1 }
      : { r: 0, g: 0, b: 0, alpha: 1 };
  try {
    const out = await sharp(bytes)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background })
      .png()
      .toBuffer({ resolveWithObject: true });
    return { bytes: out.data, width: out.info.width, height: out.info.height };
  } catch (err) {
    log.warn("[pond screenshot:tweet] padding failed, using raw", err);
    return { bytes, width: raw.width, height: raw.height };
  }
}

async function emulateColorScheme(
  win: BrowserWindow,
  scheme: "light" | "dark",
): Promise<() => Promise<void>> {
  const dbg = win.webContents.debugger;
  const alreadyAttached = dbg.isAttached();
  let attachedHere = false;
  try {
    if (!alreadyAttached) {
      dbg.attach("1.3");
      attachedHere = true;
    }
    await dbg.sendCommand("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    });
  } catch (err) {
    log.warn(
      "[pond screenshot:tweet] emulated media setup failed",
      scheme,
      err,
    );
    if (attachedHere) {
      try {
        dbg.detach();
      } catch {
        /* attach failed mid-flight; nothing to detach */
      }
    }
    return async () => {};
  }
  return async () => {
    try {
      await dbg.sendCommand("Emulation.setEmulatedMedia", { features: [] });
    } catch {
      /* override may already be cleared; safe to ignore */
    }
    if (attachedHere) {
      try {
        dbg.detach();
      } catch {
        /* wc may have been destroyed mid-capture; pool drops it */
      }
    }
  };
}

// Override device scale factor for `fn` via CDP; the lever for sharper PNGs.
async function withDeviceScaleFactor<T>(
  win: BrowserWindow,
  factor: number,
  fn: () => Promise<T>,
): Promise<T> {
  const dbg = win.webContents.debugger;
  const alreadyAttached = dbg.isAttached();
  let attachedHere = false;
  try {
    if (!alreadyAttached) {
      dbg.attach("1.3");
      attachedHere = true;
    }
    const [width, height] = win.getContentSize();
    await dbg.sendCommand("Emulation.setDeviceMetricsOverride", {
      width: width ?? 1280,
      height: height ?? 1024,
      deviceScaleFactor: factor,
      mobile: false,
    });
    return await fn();
  } finally {
    try {
      await dbg.sendCommand("Emulation.clearDeviceMetricsOverride");
    } catch {
      /* override may already be cleared; safe to ignore */
    }
    if (attachedHere) {
      try {
        dbg.detach();
      } catch {
        /* detach can throw if the wc was destroyed mid-capture */
      }
    }
  }
}

interface ArticleRect {
  x: number;
  y: number;
  width: number;
  height: number;
  quotedUrl?: string;
}

async function readArticleRect(
  win: BrowserWindow,
  tweetId: string,
): Promise<ArticleRect | null> {
  const expr = buildArticleRectExpression(tweetId);
  const raw = await Promise.race([
    win.webContents.executeJavaScript(expr, true),
    sleep(SCREENSHOT_ARTICLE_TIMEOUT_MS).then(
      () => "__pond_screenshot_timeout__",
    ),
  ]);
  if (raw === "__pond_screenshot_timeout__") return null;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ArticleRect>;
  if (
    typeof r.x !== "number" ||
    typeof r.y !== "number" ||
    typeof r.width !== "number" ||
    typeof r.height !== "number"
  ) {
    return null;
  }
  if (r.width < 8 || r.height < 8) return null;
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    ...(typeof r.quotedUrl === "string" ? { quotedUrl: r.quotedUrl } : {}),
  };
}

function buildArticleRectExpression(tweetId: string): string {
  // Scroll to top, not center: centering yields a negative top that clips the article.
  return `(async () => {
    try {
      const tweetId = ${JSON.stringify(tweetId)};
      const findArticle = () => {
        const anchor = document.querySelector('a[href*="/status/' + tweetId + '"]');
        return anchor && anchor.closest('article');
      };
      const articleDeadline = Date.now() + 10_000;
      let article = findArticle();
      while (!article && Date.now() < articleDeadline) {
        await new Promise(r => setTimeout(r, 200));
        article = findArticle();
      }
      if (!article) return null;

      window.scrollTo(0, 0);
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
      await new Promise(r => requestAnimationFrame(() => r(null)));
      await new Promise(r => setTimeout(r, 150));

      const r = article.getBoundingClientRect();

      // The raw article box includes the conversation thread spine / left
      // gutter and the footer chrome below the action bar ("Relevant"
      // reply-sort, "View quotes"). Derive a tight box from the tweet's
      // actual content instead: left/top/right from the content union and
      // bottom from the action bar. In-between rows (timestamp, "N Views")
      // fall inside the rectangle automatically.
      const inner = Array.from(article.querySelectorAll('article'))
        .find((a) => a !== article);
      const focal = (el) => !!el && el.closest('article') === article;
      const rects = [];
      const add = (el) => { if (focal(el)) rects.push(el.getBoundingClientRect()); };
      add(article.querySelector('[data-testid^="UserAvatar-Container"]'));
      add(article.querySelector('[data-testid="User-Name"]'));
      for (const sel of ['[data-testid="tweetText"]','[data-testid="tweetPhoto"]','[data-testid="card.wrapper"]','[data-testid="videoPlayer"]','[data-testid="videoComponent"]','video']) {
        for (const el of article.querySelectorAll(sel)) add(el);
      }
      if (inner) rects.push(inner.getBoundingClientRect());

      let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
      if (rects.length) {
        left = Math.max(r.left, Math.min(...rects.map((b) => b.left)));
        top = Math.max(r.top, Math.min(...rects.map((b) => b.top)));
        right = Math.min(r.right, Math.max(...rects.map((b) => b.right)));
      }

      // Bottom: prefer the action-bar buttons, then the [role="group"]
      // that wraps them, then the content union, finally the full article
      // rect. Each fallback is content-safe.
      let actionBottom = 0;
      for (const b of article.querySelectorAll('[data-testid="reply"],[data-testid="retweet"],[data-testid="unretweet"],[data-testid="like"],[data-testid="unlike"],[data-testid="bookmark"]')) {
        if (focal(b)) actionBottom = Math.max(actionBottom, b.getBoundingClientRect().bottom);
      }
      if (actionBottom === 0) {
        const group = Array.from(article.querySelectorAll('[role="group"]'))
          .filter((g) => g.closest('article') === article)
          .find((g) => g.querySelector('[data-testid="reply"], [data-testid="like"], [data-testid="retweet"], [data-testid="unretweet"], [data-testid="unlike"]'));
        if (group) actionBottom = group.getBoundingClientRect().bottom;
      }
      if (actionBottom > top && actionBottom <= r.bottom) {
        bottom = actionBottom + 6;
      } else if (rects.length) {
        bottom = Math.max(...rects.map((b) => b.bottom));
      }

      // Discover the quoted tweet (the inline nested <article>) so the
      // caller can walk the quote chain by navigating to it.
      let quotedUrl;
      try {
        const link = inner && inner.querySelector('a[href*="/status/"]');
        if (link) {
          const u = new URL(link.href, 'https://x.com');
          const m = u.pathname.match(/\\/status\\/(\\d+)/);
          if (m) quotedUrl = 'https://x.com' + u.pathname;
        }
      } catch (_) {}

      return {
        x: left,
        y: top,
        width: Math.max(8, right - left),
        height: Math.max(8, bottom - top),
        ...(quotedUrl ? { quotedUrl } : {}),
      };
    } catch (_) {
      return null;
    }
  })()`;
}
