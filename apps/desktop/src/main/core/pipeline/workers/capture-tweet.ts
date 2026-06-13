import type { SaveFile } from "@pond/schema/db";
import type { CaptureMedia, RawJson } from "@pond/schema/raw";
import log from "electron-log/main.js";
import { persistSave } from "../../persist-save";
import type { ScrapedHarvest } from "../../refresh/harvest/types";
import {
  screenshotTweet,
  type TweetScreenshotResult,
} from "../../refresh/scrape-window";
import { readSave } from "./apply";

// Distinct from `cover`/`media`/`video` so the renderer can show the
// screenshot as a tweet's primary thumbnail while keeping the actual
// extracted media available in the detail carousel. The light/dark
// variants are the live targets.
export const TWEET_SCREENSHOT_LIGHT_KIND = "tweet_screenshot_light";
export const TWEET_SCREENSHOT_DARK_KIND = "tweet_screenshot_dark";

// Quote-screenshot kinds are suffixed with the 1-based depth of the
// quoted tweet in the chain, e.g. `tweet_screenshot_quote1_light` is the
// tweet the save directly quotes. The renderer matches these by prefix
// (see core/data/media.ts).
function quoteScreenshotKind(depth: number, scheme: "light" | "dark"): string {
  return `tweet_screenshot_quote${depth}_${scheme}`;
}

// Bump when the capture output changes (new trim/padding, quote walking)
// so the startup backfill re-runs once per save to regenerate stale
// screenshots and backfill quoted media. Stored on each save at
// `rawJson.capture.extras.captureTweetVersion`.
export const CAPTURE_TWEET_VERSION = 3;

// How far down a quote-of-a-quote chain the walker follows. Matches the
// merge cap in twitter-seed.ts; keeps navigation bounded and avoids
// hammering X for pathological chains.
const QUOTE_DEPTH_CAP = 3;

export interface CaptureTweetResult {
  // Number of screenshot variants written this run.
  captured: number;
  // True when at least one variant failed specifically because the
  // scrape session hit X's auth wall. Lets a backfill bail early when
  // the session isn't actually logged in instead of hammering X.
  authWall: boolean;
  // True when quoted media was merged into `capture.media` this run, so
  // an out-of-band caller (the backfill) knows to run `fetch_blobs`.
  mediaAdded: boolean;
}

// readCaptureTweetVersion: the capture version a save was last processed
// at. Absent on saves captured before quote walking / the version stamp,
// which read as 0 so the backfill picks them up.
export function readCaptureTweetVersion(rawJson: unknown): number {
  if (!rawJson || typeof rawJson !== "object") return 0;
  const extras = (rawJson as RawJson).capture?.extras as
    | Record<string, unknown>
    | undefined;
  const v = extras?.captureTweetVersion;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// runCaptureTweet: runs for every twitter save, regardless of whether the
// extractor pulled real media off the tweet. Captures a light + dark
// screenshot of the tweet (the canonical visual identity in the grid /
// preview), then walks the quote chain: each quoted tweet gets its own
// standalone light/dark screenshot and its media merged into
// `capture.media` (downloaded by the subsequent `fetch_blobs`).
//
// Idempotent via `CAPTURE_TWEET_VERSION`: a save already stamped at the
// current version is skipped entirely; otherwise the full capture runs
// and stamps the version on completion. Re-captures replace existing
// screenshot files so a version bump regenerates them with the latest
// trim/padding.
//
// Returns silently on every failure mode (auth wall, no article,
// network) so a screenshot miss never marks the save as failed; the
// placeholder gradient is a fine interim state until the next refresh
// tries again.
export async function runCaptureTweet(
  saveId: string,
): Promise<CaptureTweetResult> {
  const idle: CaptureTweetResult = {
    captured: 0,
    authWall: false,
    mediaAdded: false,
  };
  const save = await readSave(saveId);
  if (!save) return idle;
  if (save.source !== "twitter") return idle;
  if (!save.sourceId) return idle;

  // Already processed at the current version: both main variants exist
  // and the quote chain was walked. Nothing to do.
  if (readCaptureTweetVersion(save.rawJson) >= CAPTURE_TWEET_VERSION) {
    log.debug("[pond pipeline:capture-tweet] up to date, skipping", saveId);
    return idle;
  }

  let captured = 0;
  let authWall = false;
  const harvested: NonNullable<ScrapedHarvest["mediaUrls"]> = [];

  // Main tweet (light + dark). Replace existing files so a version bump
  // regenerates them with the latest trim/padding.
  const main = await captureVariants(saveId, {
    url: save.url,
    sourceId: save.sourceId,
    lightKind: TWEET_SCREENSHOT_LIGHT_KIND,
    darkKind: TWEET_SCREENSHOT_DARK_KIND,
    lightFilename: "tweet-light.png",
    darkFilename: "tweet-dark.png",
    harvestMedia: false,
  });
  captured += main.captured;
  if (main.authWall) authWall = true;

  // The session is dead - bail before walking the chain so we don't
  // hammer X, and leave the version unstamped so the next run retries.
  if (main.authWall && main.captured === 0) {
    return { captured, authWall: true, mediaAdded: false };
  }

  // Only stamp the version once both main variants exist. A single-variant
  // capture (one scheme flaked on a cold navigation) stays unstamped so the
  // next refresh retries and backfills the missing variant instead of being
  // skipped forever, leaving the renderer to fall back to the wrong theme.
  let completed = main.complete;
  let nextUrl = main.quotedUrl;
  for (let depth = 1; nextUrl && depth <= QUOTE_DEPTH_CAP; depth += 1) {
    const quotedId = parseTweetId(nextUrl);
    if (!quotedId) break;
    const quote = await captureVariants(saveId, {
      url: nextUrl,
      sourceId: quotedId,
      lightKind: quoteScreenshotKind(depth, "light"),
      darkKind: quoteScreenshotKind(depth, "dark"),
      lightFilename: `tweet-quote${depth}-light.png`,
      darkFilename: `tweet-quote${depth}-dark.png`,
      harvestMedia: true,
    });
    captured += quote.captured;
    if (quote.media) harvested.push(...quote.media);
    if (quote.authWall) {
      authWall = true;
      completed = false;
      break;
    }
    // A quoted tweet that only captured one scheme keeps the save
    // unstamped too, so its missing variant is retried on the next run.
    if (!quote.complete) completed = false;
    nextUrl = quote.quotedUrl;
  }

  // Merge any quoted media into capture.media and stamp the version in a
  // single rawJson write. Stamp only when the walk completed (an auth
  // wall mid-walk leaves it unstamped so the next run retries).
  const mediaAdded = await finalizeRawJson(saveId, save.rawJson, harvested, {
    stampVersion: completed,
  });

  log.info("[pond pipeline:capture-tweet] done", {
    saveId,
    captured,
    mediaAdded,
    completed,
  });
  return { captured, authWall, mediaAdded };
}

interface CaptureVariantsArgs {
  url: string;
  sourceId: string;
  lightKind: string;
  darkKind: string;
  lightFilename: string;
  darkFilename: string;
  harvestMedia: boolean;
}

interface CaptureVariantsResult {
  captured: number;
  // Both the light and dark variant were written this run. Drives the
  // version stamp: a single-variant capture (one scheme flaked on a cold
  // navigation) must stay unstamped so the next refresh retries and
  // backfills the missing variant instead of being skipped forever.
  complete: boolean;
  authWall: boolean;
  quotedUrl?: string;
  media?: ScrapedHarvest["mediaUrls"];
}

// captureVariants: screenshot one tweet in both color schemes and persist
// each variant (replacing any prior file of that kind). Harvests media
// off the page on the light pass when requested. Returns the quoted-tweet
// URL discovered on the page so the caller can walk the chain.
async function captureVariants(
  saveId: string,
  args: CaptureVariantsArgs,
): Promise<CaptureVariantsResult> {
  let captured = 0;
  let authWall = false;
  let lightOk = false;
  let darkOk = false;

  const light: TweetScreenshotResult = await screenshotTweet({
    url: args.url,
    sourceId: args.sourceId,
    colorScheme: "light",
    harvestMedia: args.harvestMedia,
  });
  if (light.ok && light.png) {
    await writeScreenshot(saveId, args.lightKind, args.lightFilename, light);
    captured += 1;
    lightOk = true;
  } else if (light.reason === "auth_required") {
    authWall = true;
  }
  let quotedUrl: string | undefined = light.quotedUrl;
  const media = light.media;

  const dark: TweetScreenshotResult = await screenshotTweet({
    url: args.url,
    sourceId: args.sourceId,
    colorScheme: "dark",
  });
  if (dark.ok && dark.png) {
    await writeScreenshot(saveId, args.darkKind, args.darkFilename, dark);
    captured += 1;
    darkOk = true;
  } else if (dark.reason === "auth_required") {
    authWall = true;
  }
  if (!quotedUrl) quotedUrl = dark.quotedUrl;

  return {
    captured,
    complete: lightOk && darkOk,
    authWall,
    ...(quotedUrl ? { quotedUrl } : {}),
    ...(media ? { media } : {}),
  };
}

async function writeScreenshot(
  saveId: string,
  kind: string,
  filename: string,
  result: TweetScreenshotResult,
): Promise<void> {
  if (!result.png) return;
  await persistSave(
    saveId,
    {},
    {
      actorReason: `pipeline:capture-tweet:${kind}`,
      replaceFilesWithKind: kind as SaveFile["kind"],
      newFiles: [
        {
          kind: kind as SaveFile["kind"],
          filename,
          bytes: result.png.bytes,
          mimeType: "image/png",
          width: result.png.width,
          height: result.png.height,
        },
      ],
    },
  );
}

// finalizeRawJson: append harvested quoted media to capture.media (deduped
// by URL) and/or stamp the capture version, in one write. Returns whether
// any new media was added so the out-of-band backfill can trigger a
// download.
async function finalizeRawJson(
  saveId: string,
  rawJsonRaw: unknown,
  harvested: NonNullable<ScrapedHarvest["mediaUrls"]>,
  opts: { stampVersion: boolean },
): Promise<boolean> {
  if (!rawJsonRaw || typeof rawJsonRaw !== "object") return false;
  const rawJson = structuredClone(rawJsonRaw) as RawJson;
  if (!rawJson.capture) return false;

  const existing = rawJson.capture.media ?? [];
  const seen = new Set(existing.map((m) => m.url));
  let mediaAdded = false;
  for (const m of harvested) {
    if (!m.url || seen.has(m.url)) continue;
    seen.add(m.url);
    const entry: CaptureMedia = {
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      ...(m.poster ? { posterUrl: m.poster } : {}),
    };
    existing.push(entry);
    mediaAdded = true;
  }
  if (mediaAdded) rawJson.capture.media = existing;

  const alreadyStamped =
    readCaptureTweetVersion(rawJson) >= CAPTURE_TWEET_VERSION;
  const willStamp = opts.stampVersion && !alreadyStamped;
  if (willStamp) {
    const extras = (rawJson.capture.extras ?? {}) as Record<string, unknown>;
    extras.captureTweetVersion = CAPTURE_TWEET_VERSION;
    rawJson.capture.extras = extras;
  }

  if (!mediaAdded && !willStamp) return mediaAdded;

  await persistSave(
    saveId,
    { rawJson },
    {
      actorReason: "pipeline:capture-tweet:quote-merge",
    },
  );
  return mediaAdded;
}

function parseTweetId(url: string): string | null {
  try {
    return new URL(url).pathname.match(/\/status\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}
