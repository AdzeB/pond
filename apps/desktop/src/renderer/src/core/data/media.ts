import type { TweetCover } from "@pond/schema/db";
import { getPrefsSnapshot } from "./prefs";
import { type ResolvedTheme, resolveCurrentTheme } from "./theme";
import type { Save, SaveFile } from "./types";
import { buildPondUrl } from "./url";

// Mirrors the kind constants exported from
// `apps/desktop/src/main/core/pipeline/workers/capture-tweet.ts`. Kept
// inline because the renderer can't reach into the main bundle and the
// schema types are intentionally `kind: string`.
const TWEET_SCREENSHOT_LEGACY_KIND = "tweet_screenshot";
const TWEET_SCREENSHOT_LIGHT_KIND = "tweet_screenshot_light";
const TWEET_SCREENSHOT_DARK_KIND = "tweet_screenshot_dark";

const TWEET_SCREENSHOT_KINDS: ReadonlySet<string> = new Set([
  TWEET_SCREENSHOT_LEGACY_KIND,
  TWEET_SCREENSHOT_LIGHT_KIND,
  TWEET_SCREENSHOT_DARK_KIND,
]);

// Standalone screenshots of quoted tweets, suffixed with their 1-based
// depth in the quote chain (see capture-tweet.ts `quoteScreenshotKind`).
// e.g. `tweet_screenshot_quote1_light`.
const QUOTE_SCREENSHOT_KIND = /^tweet_screenshot_quote(\d+)_(light|dark)$/;

function isQuoteScreenshotKind(kind: string): boolean {
  return QUOTE_SCREENSHOT_KIND.test(kind);
}

export interface MediaUnit {
  key: string;
  url: string;
  isVideo: boolean;
  posterUrl?: string;
}

interface MediaPickOptions {
  theme?: ResolvedTheme;
  tweetCover?: TweetCover;
}

// Read the current tweet-cover mode for callers outside React (the
// library list filter, aspect store, NSFW classifier). React callers
// should pass `tweetCover` explicitly so the UI re-picks when the
// setting changes. Mirrors `resolveCurrentTheme()`.
function resolveCurrentTweetCover(): TweetCover {
  return getPrefsSnapshot()?.preferences?.tweetCover ?? "media";
}

export function buildMediaUnits(
  save: Save,
  opts: MediaPickOptions = {},
): MediaUnit[] {
  // Tweet screenshots are a thumbnail asset, not a carousel slide; drop
  // the main ones when there's real extracted media to walk. Quote
  // screenshots are handled separately (appended after extracted media).
  // Avatars are author metadata and never belong in the carousel.
  const files = (save.files ?? []).filter(
    (f) =>
      f.kind !== "avatar" &&
      !TWEET_SCREENSHOT_KINDS.has(f.kind) &&
      !isQuoteScreenshotKind(f.kind),
  );
  const posters = files.filter((f) => f.kind === "poster");
  const slides = files.filter((f) => f.kind !== "poster");

  // Standalone screenshots of each quoted tweet, theme-matched and in
  // chain order, appended after the parent's extracted media.
  const quoteUnits = buildQuoteScreenshotUnits(save, opts.theme);

  const videos = slides.filter(isVideoFile);
  const images = slides.filter((f) => !isVideoFile(f));

  // Single-stream save (YouTube, TikTok, single IG reel, Twitter video):
  // one video plus optionally one cover image acting as the poster: emit
  // a single unit and use the cover as the poster instead of a standalone
  // slide. Anything else is a carousel and gets walked in declared order.
  if (videos.length === 1 && images.length <= 1 && quoteUnits.length === 0) {
    const video = videos[0];
    if (!video) return [];
    const poster = posters[0] ?? images[0];
    return [
      {
        key: video.path,
        url: buildPondUrl(save.id, video),
        isVideo: true,
        ...(poster ? { posterUrl: buildPondUrl(save.id, poster) } : {}),
      },
    ];
  }

  const units: MediaUnit[] = [];
  let videoSeen = 0;
  for (const f of slides) {
    if (isVideoFile(f)) {
      const poster = posters[videoSeen];
      units.push({
        key: f.path,
        url: buildPondUrl(save.id, f),
        isVideo: true,
        ...(poster ? { posterUrl: buildPondUrl(save.id, poster) } : {}),
      });
      videoSeen++;
    } else {
      units.push({
        key: f.path,
        url: buildPondUrl(save.id, f),
        isVideo: false,
      });
    }
  }
  units.push(...quoteUnits);
  if (units.length > 0) return units;

  // Twitter saves with no extracted media (text-only tweets, or tweets
  // whose blobs haven't downloaded yet) fall back to the captured tweet
  // screenshot so the detail carousel and pane cover both render
  // something. Without this the detail page's media frame would be
  // blank for every text-only tweet.
  const screenshot = pickTweetScreenshot(save, opts.theme);
  if (screenshot) {
    return [
      {
        key: screenshot.path,
        url: buildPondUrl(save.id, screenshot),
        isVideo: false,
      },
      ...quoteUnits,
    ];
  }
  return units;
}

// buildQuoteScreenshotUnits: one slide per quoted tweet in the chain,
// picking the theme-matched variant (falling back to the other theme),
// ordered by depth.
function buildQuoteScreenshotUnits(
  save: Save,
  theme: ResolvedTheme | undefined,
): MediaUnit[] {
  if (save.source !== "twitter") return [];
  const files = save.files ?? [];
  const resolved = theme ?? resolveCurrentTheme();

  const byDepth = new Map<number, { light?: SaveFile; dark?: SaveFile }>();
  for (const f of files) {
    const m = QUOTE_SCREENSHOT_KIND.exec(f.kind);
    if (!m) continue;
    const depth = Number.parseInt(m[1] ?? "", 10);
    if (!Number.isFinite(depth)) continue;
    const slot = byDepth.get(depth) ?? {};
    if (m[2] === "light") slot.light = f;
    else slot.dark = f;
    byDepth.set(depth, slot);
  }

  const units: MediaUnit[] = [];
  for (const depth of Array.from(byDepth.keys()).sort((a, b) => a - b)) {
    const slot = byDepth.get(depth);
    if (!slot) continue;
    const preferred = resolved === "light" ? slot.light : slot.dark;
    const file = preferred ?? slot.light ?? slot.dark;
    if (!file) continue;
    units.push({
      key: file.path,
      url: buildPondUrl(save.id, file),
      isVideo: false,
    });
  }
  return units;
}

// pickPrimaryUnit: returns the unit that should drive thumbnails and
// pane covers. For Twitter saves the `tweetCover` mode decides between
// the theme-matched tweet screenshot (see `capture-tweet.ts`) and the
// extracted media; every other source always uses extracted media.
//
// - "screenshot": always the rendered tweet card.
// - "media": prefer extracted media; the screenshot only surfaces as
//   `buildMediaUnits`' last-resort fallback for text-only tweets.
export function pickPrimaryUnit(
  save: Save,
  opts: MediaPickOptions = {},
): MediaUnit | null {
  const mode = opts.tweetCover ?? resolveCurrentTweetCover();
  const screenshot = pickTweetScreenshot(save, opts.theme);
  // "screenshot" forces the tweet card; "media" falls through to
  // `buildMediaUnits`, which still returns the screenshot as the
  // last-resort fallback for text-only tweets.
  if (screenshot && mode === "screenshot") {
    return {
      key: screenshot.path,
      url: buildPondUrl(save.id, screenshot),
      isVideo: false,
    };
  }

  const units = buildMediaUnits(save, opts);
  const video = units.find((u) => u.isVideo);
  if (video) return video;
  return units[0] ?? null;
}

// Companion to pickPrimaryUnit: returns the underlying SaveFile so
// callers can read dimensions for aspect-ratio fallbacks. Matches by
// path because `MediaUnit.key` is the file's path on disk.
export function pickPrimaryFile(
  save: Save,
  opts: MediaPickOptions = {},
): SaveFile | null {
  const unit = pickPrimaryUnit(save, opts);
  if (!unit) return null;
  return (save.files ?? []).find((f) => f.path === unit.key) ?? null;
}

// pickTweetScreenshot: resolves the theme-appropriate screenshot
// variant. Prefers the matching theme, then the other theme, then the
// legacy single-variant file. Returns null for non-twitter saves or
// when no screenshot exists yet.
function pickTweetScreenshot(
  save: Save,
  theme: ResolvedTheme | undefined,
): SaveFile | null {
  if (save.source !== "twitter") return null;
  const files = save.files ?? [];
  const resolved = theme ?? resolveCurrentTheme();
  const preferredKind =
    resolved === "light"
      ? TWEET_SCREENSHOT_LIGHT_KIND
      : TWEET_SCREENSHOT_DARK_KIND;
  const otherKind =
    resolved === "light"
      ? TWEET_SCREENSHOT_DARK_KIND
      : TWEET_SCREENSHOT_LIGHT_KIND;
  return (
    files.find((f) => f.kind === preferredKind) ??
    files.find((f) => f.kind === otherKind) ??
    files.find((f) => f.kind === TWEET_SCREENSHOT_LEGACY_KIND) ??
    null
  );
}

function isVideoFile(file: SaveFile): boolean {
  if (file.kind === "video") return true;
  if (file.mimeType?.startsWith("video/") === true) return true;
  return /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.path);
}
