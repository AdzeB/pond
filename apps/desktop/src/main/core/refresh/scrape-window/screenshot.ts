import type { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";
import { partitionForIngest } from "../../sync/accounts";
import { adapt, buildExpression } from "../harvest/twitter";
import type { ScrapedHarvest } from "../harvest/types";
import { NAV_TIMEOUT_MS } from "./constants";
import { looksLikeAuthWall, navigateWithTimeout } from "./navigation";
import { leaseWindow } from "./pool";
import { emulateColorScheme, withDeviceScaleFactor } from "./screenshot-cdp";
import { buildArticleRectExpression } from "./screenshot-dom";
import { sleep } from "./util";

export interface TweetScreenshotResult {
  ok: boolean;
  png?: { bytes: Buffer; width: number; height: number };
  reason?: "navigate_failed" | "auth_required" | "no_article" | "timeout";
  /** Quoted tweet's canonical URL, for walking the quote chain. */
  quotedUrl?: string;
  /** Media harvested off the page when `harvestMedia` was requested. */
  media?: ScrapedHarvest["mediaUrls"];
}

/** Padding around the card in CSS pixels; scaled by the device factor. */
const SCREENSHOT_PADDING_CSS = 24;

const SCREENSHOT_ARTICLE_TIMEOUT_MS = 12_000;

/** Override DPR via CDP so captures stay sharp regardless of host display. */
const CAPTURE_DEVICE_SCALE_FACTOR = 3;

/** Bottom padding so lazy-loaded media in the last row isn't clipped. */
const SCREENSHOT_VERTICAL_PADDING = 40;

/** Hard cap on hidden-window height; anything beyond is cropped. */
const SCREENSHOT_MAX_HEIGHT = 8192;

/** capturePage can hang indefinitely on a wedged hidden window; bound it so a stuck capture can't hold its window lease and starve the pool. */
const CAPTURE_PAGE_TIMEOUT_MS = 15_000;

interface TweetDualScreenshotArgs {
  url: string;
  sourceId: string;
  /** Harvest media off the loaded page (once); used by the quote walker. */
  harvestMedia?: boolean;
  /** Connected account whose session should load the page, when known. */
  accountId?: string | null;
}

interface TweetDualScreenshotResult {
  light: TweetScreenshotResult;
  dark: TweetScreenshotResult;
  quotedUrl?: string;
  media?: ScrapedHarvest["mediaUrls"];
}

/** Captures both color schemes from one window lease and, when X re-themes live, one navigation — halving X.com loads per tweet; reloads only when the flip doesn't take. */
export async function screenshotTweetDual(
  args: TweetDualScreenshotArgs,
): Promise<TweetDualScreenshotResult> {
  const partition = await partitionForIngest("twitter", args.accountId);
  const lease = await leaseWindow("twitter", { partition });
  let restoreEmulation: (() => Promise<void>) | null = null;
  try {
    restoreEmulation = await emulateColorScheme(lease.win, "light");
    const navOk = await navigateWithTimeout(
      lease.win,
      args.url,
      NAV_TIMEOUT_MS,
    );
    if (!navOk) {
      log.warn("[pond screenshot:tweet] navigate failed", args.url);
      const fail: TweetScreenshotResult = {
        ok: false,
        reason: "navigate_failed",
      };
      return { light: fail, dark: fail };
    }
    if (looksLikeAuthWall(lease.win.webContents.getURL())) {
      log.info("[pond screenshot:tweet] auth wall hit", args.url);
      const wall: TweetScreenshotResult = {
        ok: false,
        reason: "auth_required",
      };
      return { light: wall, dark: wall };
    }

    const light = await captureCurrentScheme(lease.win, args.sourceId, "light");

    /** Harvest media once on the light pass to avoid a second page evaluation on the dark pass. */
    let media: ScrapedHarvest["mediaUrls"] | undefined;
    if (args.harvestMedia && light.ok) {
      const harvested = await harvestPageMedia(lease.win, args.sourceId);
      if (harvested && harvested.length > 0) media = harvested;
    }

    /** Clear the light override first so the flip detector reads X's own theme background, not our pinned html background. */
    if (restoreEmulation) await restoreEmulation().catch(() => {});
    restoreEmulation = await emulateColorScheme(lease.win, "dark");
    const flipped = await waitForSchemeFlip(lease.win, "dark");
    if (!flipped) {
      /** X ignores the live media change when the account pins an explicit theme; reload so the page re-mounts in dark. */
      log.debug("[pond screenshot:tweet] scheme flip needed reload", args.url);
      await navigateWithTimeout(lease.win, args.url, NAV_TIMEOUT_MS);
    }
    const dark = await captureCurrentScheme(lease.win, args.sourceId, "dark");

    const quotedUrl = light.quotedUrl ?? dark.quotedUrl;
    return {
      light,
      dark,
      ...(quotedUrl ? { quotedUrl } : {}),
      ...(media ? { media } : {}),
    };
  } catch (err) {
    log.warn("[pond screenshot:tweet] unexpected dual error", args.url, err);
    const fail: TweetScreenshotResult = { ok: false, reason: "no_article" };
    return { light: fail, dark: fail };
  } finally {
    if (restoreEmulation) await restoreEmulation().catch(() => {});
    lease.release();
  }
}

/** Captures the focused article in the window's current navigation and emulated scheme; pins the html background for this capture only. */
async function captureCurrentScheme(
  win: BrowserWindow,
  sourceId: string,
  colorScheme: "light" | "dark",
): Promise<TweetScreenshotResult> {
  /** Pin html background to the scheme so rect rounding doesn't leak edge color. */
  const htmlBg = colorScheme === "light" ? "#fff" : "#000";
  /** Hide "View quotes" and strip article borders so a divider can't leak into the trim. */
  const cssKey = await win.webContents
    .insertCSS(
      `[data-testid="BottomBar"], [data-testid="bottomBar"], [data-testid="login"] { display: none !important; }
       a[href$="/quotes"], a[href$="/retweets/with_comments"] { display: none !important; }
       article { border: 0 !important; }
       html { color-scheme: ${colorScheme}; background: ${htmlBg} !important; }`,
    )
    .catch(() => undefined);

  try {
    const initial = await readArticleRect(win, sourceId);
    if (!initial) {
      log.info("[pond screenshot:tweet] no article", sourceId);
      return { ok: false, reason: "no_article" };
    }

    /** Resize to fit the whole article (capturePage crops overflow), then re-measure. */
    const [contentWidthRaw, originalContentHeightRaw] = win.getContentSize();
    const contentWidth = contentWidthRaw ?? 1280;
    const originalContentHeight = originalContentHeightRaw ?? 1024;
    const requiredHeight = Math.ceil(
      initial.y + initial.height + SCREENSHOT_VERTICAL_PADDING,
    );
    let rect = initial;
    let resized = false;
    if (requiredHeight > originalContentHeight) {
      const target = Math.min(requiredHeight, SCREENSHOT_MAX_HEIGHT);
      win.setContentSize(contentWidth, target);
      resized = true;
      await sleep(400);
      const remeasured = await readArticleRect(win, sourceId);
      if (remeasured) rect = remeasured;
    }

    try {
      return await withDeviceScaleFactor(
        win,
        CAPTURE_DEVICE_SCALE_FACTOR,
        async () => {
          const image = await Promise.race([
            win.webContents.capturePage({
              x: Math.max(0, Math.floor(rect.x)),
              y: Math.max(0, Math.floor(rect.y)),
              width: Math.max(1, Math.ceil(rect.width)),
              height: Math.max(1, Math.ceil(rect.height)),
            }),
            sleep(CAPTURE_PAGE_TIMEOUT_MS).then(() => {
              throw new Error(
                `capturePage timed out after ${CAPTURE_PAGE_TIMEOUT_MS}ms`,
              );
            }),
          ]);
          const rawBytes = image.toPNG();
          const size = image.getSize();
          if (
            rawBytes.byteLength === 0 ||
            size.width === 0 ||
            size.height === 0
          ) {
            log.warn("[pond screenshot:tweet] empty capture", sourceId);
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
    } finally {
      if (resized) {
        try {
          win.setContentSize(contentWidth, originalContentHeight);
        } catch {
          /** Window may have been destroyed mid-capture; pool drops it. */
        }
      }
    }
  } finally {
    if (cssKey) await win.webContents.removeInsertedCSS(cssKey).catch(() => {});
  }
}

/** Polls body background luminance until it matches the target scheme or the deadline passes; transparent/unknown counts as not flipped. */
async function waitForSchemeFlip(
  win: BrowserWindow,
  target: "light" | "dark",
): Promise<boolean> {
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    const lum = await readBackgroundLuminance(win);
    if (lum != null) {
      if (target === "dark" && lum < 0.4) return true;
      if (target === "light" && lum > 0.6) return true;
    }
    await sleep(150);
  }
  return false;
}

async function readBackgroundLuminance(
  win: BrowserWindow,
): Promise<number | null> {
  const expr = `(() => {
    try {
      const c = getComputedStyle(document.body).backgroundColor || '';
      const m = c.match(/rgba?\\(([^)]+)\\)/);
      if (!m) return null;
      const parts = m[1].split(',').map((s) => parseFloat(s));
      const [r, g, b, a] = parts;
      if (a === 0) return null;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    } catch (_) {
      return null;
    }
  })()`;
  try {
    const raw = await Promise.race([
      win.webContents.executeJavaScript(expr, true),
      sleep(1000).then(() => null),
    ]);
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Harvests media off the already-loaded page; best-effort, returns undefined on failure. */
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

/** Wraps the card in scheme-colored padding, scaled to the capture device factor. */
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
