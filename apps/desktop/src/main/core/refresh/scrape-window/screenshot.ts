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
  // Forces the captured tweet's color scheme. Defaults to "dark" so the
  // pre-dual-theme behaviour is preserved for any caller that hasn't
  // been updated.
  colorScheme?: "light" | "dark";
  // When true, also harvest the tweet's media off the loaded page and
  // return it. Used by the quote walker to pick up media from quoted
  // tweets deeper in the chain without a second navigation.
  harvestMedia?: boolean;
}

export interface TweetScreenshotResult {
  ok: boolean;
  png?: { bytes: Buffer; width: number; height: number };
  reason?: "navigate_failed" | "auth_required" | "no_article" | "timeout";
  // When the captured tweet quotes another tweet, the quoted tweet's
  // canonical URL, so the caller can walk the quote chain.
  quotedUrl?: string;
  // Media harvested off the page when `harvestMedia` was requested.
  media?: ScrapedHarvest["mediaUrls"];
}

// Uniform breathing room added around the captured card, in CSS pixels.
// Scaled by the capture device factor below so the visual padding is the
// same regardless of how sharp the PNG is rendered.
const SCREENSHOT_PADDING_CSS = 24;

const SCREENSHOT_ARTICLE_TIMEOUT_MS = 12_000;

// 3x of the article's CSS-pixel rect. Electron's `capturePage` captures
// at the WebContents' device scale factor, and the hidden pool window
// inherits the primary display's DPR (typically 1 or 2). Override it via
// CDP so captures look sharp regardless of the host display.
const CAPTURE_DEVICE_SCALE_FACTOR = 3;

// Vertical breathing room added below the article when we resize the
// window to fit it. Without padding, lazy-loaded media in the last image
// row can poke into the bottom edge.
const SCREENSHOT_VERTICAL_PADDING = 40;

// Absolute cap on hidden-window content height. Tweets with huge
// embedded carousels can otherwise drive the window past safe limits;
// anything beyond this just gets cropped at the bottom (rare).
const SCREENSHOT_MAX_HEIGHT = 8192;

// screenshotTweet: opens the tweet in a hidden window, finds the
// rendered <article>, and captures just that element via
// `webContents.capturePage(rect)`. Reuses the same window pool / cookies
// as `harvestUrl`, so logged-in tweets work when the X integration is
// connected. Returns `ok: false` for any failure; callers should treat
// misses as a no-op and fall back to whatever they were rendering
// before (we never want a screenshot miss to mark a save as failed).
export async function screenshotTweet(
  args: TweetScreenshotArgs,
): Promise<TweetScreenshotResult> {
  const colorScheme = args.colorScheme ?? "dark";
  const lease = await leaseWindow("twitter");
  // CDP's `Emulation.setEmulatedMedia` has to be in place before the
  // navigation commits. X reads `prefers-color-scheme` once on mount
  // and never reacts to a mid-life flip, so flipping it after the page
  // has rendered would only repaint the platform chrome and leave the
  // article unchanged.
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

    // Belt-and-braces alongside the CDP emulated media: hide X's sticky
    // sign-up chrome and pin the html background to match the requested
    // scheme so any rounding in the article rect doesn't leak the host
    // window's default color through the screenshot's edges.
    const htmlBg = colorScheme === "light" ? "#fff" : "#000";
    // Belt-and-braces alongside the action-bar rect trim below: hide the
    // "View quotes" link and strip borders on the focal article so a
    // trailing hairline divider can't leak into the trimmed edge.
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

    // Resize the hidden window tall enough to fit the entire article in
    // a single viewport before capturing. `capturePage` only captures
    // content that's been laid out within the live viewport; if the
    // article overflows, the bottom is silently cropped. After the
    // resize we re-measure because lazy media / sticky chrome can shift
    // the article's rect when more vertical space becomes available.
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

// harvestPageMedia: reuse the in-page tweet harvester to pull media off
// the already-loaded screenshot page. Lets the quote walker collect a
// quoted tweet's media without a second navigation. Best-effort: returns
// undefined on any failure so a media miss never blocks the screenshot.
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

// padScreenshot: wrap the captured card in a uniform margin filled with
// the scheme background so the screenshot has breathing room and any
// rounding at the trimmed edges blends in. The capture is rendered at
// CAPTURE_DEVICE_SCALE_FACTOR, so the CSS padding is scaled to match.
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

// Override Chromium's device scale factor for the duration of `fn` via
// the DevTools Protocol. `capturePage` writes back a NativeImage sized at
// `cssRect × deviceScaleFactor`, so this is the lever for sharper PNGs
// without changing the page's CSS-pixel layout.
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
  // Scroll to the very top of the document instead of centering the
  // article. Centering produces a negative top when the article is
  // taller than the viewport, which the capture path used to clamp to
  // 0, pulling in X's "Post" header above the article and clipping the
  // bottom. With scrollTo(0, 0), `rect.y` is the article's natural
  // distance below X's chrome (positive), and the caller resizes the
  // window so `rect.y + rect.height` still fits inside the viewport.
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
