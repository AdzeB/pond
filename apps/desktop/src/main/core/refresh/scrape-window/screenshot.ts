import type { BrowserWindow } from "electron";
import log from "electron-log/main.js";
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
}

export interface TweetScreenshotResult {
  ok: boolean;
  png?: { bytes: Buffer; width: number; height: number };
  reason?: "navigate_failed" | "auth_required" | "no_article" | "timeout";
}

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
    await lease.win.webContents
      .insertCSS(
        `[data-testid="BottomBar"], [data-testid="bottomBar"], [data-testid="login"] { display: none !important; }
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
      return await withDeviceScaleFactor(
        lease.win,
        CAPTURE_DEVICE_SCALE_FACTOR,
        async () => {
          const image = await lease.win.webContents.capturePage({
            x: Math.max(0, Math.floor(rect.x)),
            y: Math.max(0, Math.floor(rect.y)),
            width: Math.max(1, Math.ceil(rect.width)),
            height: Math.max(1, Math.ceil(rect.height)),
          });
          const bytes = image.toPNG();
          const size = image.getSize();
          if (bytes.byteLength === 0 || size.width === 0 || size.height === 0) {
            log.warn("[pond screenshot:tweet] empty capture", args.url);
            return { ok: false, reason: "no_article" } as const;
          }
          return {
            ok: true,
            png: { bytes, width: size.width, height: size.height },
          } as const;
        },
      );
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
  return r as ArticleRect;
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
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    } catch (_) {
      return null;
    }
  })()`;
}
