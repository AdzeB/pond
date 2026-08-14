import type { SaveFile } from "@pond/schema/db";
import type { CaptureMedia, RawJson } from "@pond/schema/raw";
import log from "electron-log/main.js";
import { persistSave } from "../../persist-save";
import type { ScrapedHarvest } from "../../refresh/harvest/types";
import {
  screenshotThreadsDual,
  screenshotTweetDual,
  type TweetScreenshotResult,
} from "../../refresh/scrape-window";
import {
  type RenderedCard,
  renderThreadsCardPng,
  renderTweetCardPng,
} from "../../render-card";
import { readSave } from "./apply";
import { inlineCaptureAvatars } from "./inline-card-avatars";

/** Distinct kind so the renderer shows the screenshot as thumbnail, keeping media in the carousel. */
const TWEET_SCREENSHOT_LIGHT_KIND = "tweet_screenshot_light";
const TWEET_SCREENSHOT_DARK_KIND = "tweet_screenshot_dark";

/** Suffixed with 1-based quote depth; renderer matches by prefix. */
function quoteScreenshotKind(depth: number, scheme: "light" | "dark"): string {
  return `tweet_screenshot_quote${depth}_${scheme}`;
}

/** Bump when capture output changes so stale screenshots are regenerated. */
const CAPTURE_TWEET_VERSION = 10;

/** Quote-chain walk depth cap; keeps navigation bounded. */
const QUOTE_DEPTH_CAP = 3;

interface CaptureTweetResult {
  /** Number of screenshot variants written this run. */
  captured: number;
  /** At least one variant hit X's auth wall; lets the caller bail or retry. */
  authWall: boolean;
  /** Quoted media merged into `capture.media`; a follow-up fetch_blobs picks it up. */
  mediaAdded: boolean;
}

/** Capture version the save was last processed at; absent reads as 0. */
function readCaptureTweetVersion(rawJson: unknown): number {
  if (!rawJson || typeof rawJson !== "object") return 0;
  const extras = (rawJson as RawJson).capture?.extras as
    | Record<string, unknown>
    | undefined;
  const v = extras?.captureTweetVersion;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function isCaptureTweetStale(rawJson: unknown): boolean {
  return readCaptureTweetVersion(rawJson) < CAPTURE_TWEET_VERSION;
}

/** Idempotent via `CAPTURE_TWEET_VERSION`; returns silently on any failure so a screenshot miss never fails the save. */
export async function runCaptureTweet(
  saveId: string,
  opts?: { nativeOnly?: boolean },
): Promise<CaptureTweetResult> {
  const idle: CaptureTweetResult = {
    captured: 0,
    authWall: false,
    mediaAdded: false,
  };
  const save = await readSave(saveId);
  if (!save) return idle;
  if (save.source !== "twitter" && save.source !== "threads") return idle;
  if (!save.sourceId) return idle;

  if (readCaptureTweetVersion(save.rawJson) >= CAPTURE_TWEET_VERSION) {
    log.debug("[pond pipeline:capture-tweet] up to date, skipping", saveId);
    return idle;
  }

  /** Preferred path: rasterize the native TweetCard — deterministic, offline, and embeds quotes inline; falls through to live screenshots when captured data or rendering is missing. */
  const rendered = await tryNativeRender(saveId, save);
  if (rendered) {
    await finalizeRawJson(saveId, save.rawJson, [], { stampVersion: true });
    log.info("[pond pipeline:capture-tweet] native card done", { saveId });
    return { captured: 2, authWall: false, mediaAdded: false };
  }

  if (opts?.nativeOnly) {
    log.debug(
      "[pond pipeline:capture-tweet] native miss, skipping live screenshot",
      saveId,
    );
    return idle;
  }

  let captured = 0;
  let authWall = false;
  const harvested: NonNullable<ScrapedHarvest["mediaUrls"]> = [];

  /** Replace existing files so a version bump regenerates them. */
  const main = await captureVariants(saveId, {
    url: save.url,
    sourceId: save.sourceId,
    source: save.source,
    lightKind: TWEET_SCREENSHOT_LIGHT_KIND,
    darkKind: TWEET_SCREENSHOT_DARK_KIND,
    lightFilename: "tweet-light.png",
    darkFilename: "tweet-dark.png",
    harvestMedia: false,
  });
  captured += main.captured;
  if (main.authWall) authWall = true;

  /** Session dead: bail before walking the chain, leave unstamped to retry. */
  if (main.authWall && main.captured === 0) {
    return { captured, authWall: true, mediaAdded: false };
  }

  /** Only stamp once both variants exist; a single-variant capture stays unstamped to retry. */
  let completed = main.complete;
  let nextUrl = main.quotedUrl ?? quotedUrlFromExtras(save.rawJson);
  for (let depth = 1; nextUrl && depth <= QUOTE_DEPTH_CAP; depth += 1) {
    const quotedId =
      save.source === "threads"
        ? parsePostCode(nextUrl)
        : parseTweetId(nextUrl);
    if (!quotedId) break;
    const quote = await captureVariants(saveId, {
      url: nextUrl,
      sourceId: quotedId,
      source: save.source,
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
    /** A one-scheme quote capture keeps the save unstamped to retry. */
    if (!quote.complete) completed = false;
    nextUrl = quote.quotedUrl;
  }

  /** Merge quoted media and stamp the version in one write; only stamp if the walk completed. */
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

/** Returns true only when both schemes succeed; any miss falls back to x.com. */
async function tryNativeRender(
  saveId: string,
  save: NonNullable<Awaited<ReturnType<typeof readSave>>>,
): Promise<boolean> {
  const rawJson = save.rawJson as RawJson | null | undefined;
  const capture = rawJson?.capture ?? null;
  if (!capture) return false;
  const inlined = await inlineCaptureAvatars(capture, save);
  const render =
    save.source === "threads" ? renderThreadsCardPng : renderTweetCardPng;
  const light = await render(inlined.capture, save.author, "light");
  if (!light) return false;
  const dark = await render(inlined.capture, save.author, "dark");
  if (!dark) return false;
  await writeCardPng(
    saveId,
    TWEET_SCREENSHOT_LIGHT_KIND,
    "tweet-light.png",
    light,
  );
  await writeCardPng(
    saveId,
    TWEET_SCREENSHOT_DARK_KIND,
    "tweet-dark.png",
    dark,
  );
  if (inlined.avatarFile) {
    try {
      await persistSave(
        saveId,
        {},
        {
          actorReason: "pipeline:capture-tweet:avatar",
          newFiles: [
            {
              kind: "avatar",
              filename: inlined.avatarFile.filename,
              bytes: Buffer.from(inlined.avatarFile.bytes),
              ...(inlined.avatarFile.mimeType
                ? { mimeType: inlined.avatarFile.mimeType }
                : {}),
              ...(inlined.avatarSourceUrl
                ? { sourceUrl: inlined.avatarSourceUrl }
                : {}),
            },
          ],
        },
      );
    } catch (err) {
      log.warn(
        "[pond pipeline:capture-tweet] avatar persist failed",
        saveId,
        err,
      );
    }
  }
  return true;
}

async function writeCardPng(
  saveId: string,
  kind: string,
  filename: string,
  card: RenderedCard,
): Promise<void> {
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
          bytes: card.bytes,
          mimeType: "image/png",
          width: card.width,
          height: card.height,
        },
      ],
    },
  );
}

interface CaptureVariantsArgs {
  url: string;
  sourceId: string;
  source: "twitter" | "threads";
  lightKind: string;
  darkKind: string;
  lightFilename: string;
  darkFilename: string;
  harvestMedia: boolean;
}

interface CaptureVariantsResult {
  captured: number;
  /** Both variants written this run; drives the version stamp. */
  complete: boolean;
  authWall: boolean;
  quotedUrl?: string;
  media?: ScrapedHarvest["mediaUrls"];
}

/** Both schemes come from a single navigation; returns the quoted-tweet URL for chain walking. */
async function captureVariants(
  saveId: string,
  args: CaptureVariantsArgs,
): Promise<CaptureVariantsResult> {
  let captured = 0;
  let authWall = false;
  let lightOk = false;
  let darkOk = false;

  const dual =
    args.source === "threads"
      ? await screenshotThreadsDual({
          url: args.url,
          sourceId: args.sourceId,
          harvestMedia: args.harvestMedia,
        })
      : await screenshotTweetDual({
          url: args.url,
          sourceId: args.sourceId,
          harvestMedia: args.harvestMedia,
        });

  const light: TweetScreenshotResult = dual.light;
  if (light.ok && light.png) {
    await writeScreenshot(saveId, args.lightKind, args.lightFilename, light);
    captured += 1;
    lightOk = true;
  } else if (light.reason === "auth_required") {
    authWall = true;
  }

  const dark: TweetScreenshotResult = dual.dark;
  if (dark.ok && dark.png) {
    await writeScreenshot(saveId, args.darkKind, args.darkFilename, dark);
    captured += 1;
    darkOk = true;
  } else if (dark.reason === "auth_required") {
    authWall = true;
  }

  const quotedUrl = dual.quotedUrl;
  const media = dual.media;

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

/** Appends deduped quoted media and/or stamps the version in one write; returns whether media was added. */
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

function parsePostCode(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    return (
      path.match(/\/post\/([A-Za-z0-9_-]+)/)?.[1] ??
      path.match(/\/t\/([A-Za-z0-9_-]+)/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

function quotedUrlFromExtras(rawJson: unknown): string | undefined {
  if (!rawJson || typeof rawJson !== "object") return undefined;
  const extras = (rawJson as RawJson).capture?.extras as
    | Record<string, unknown>
    | undefined;
  const rich = extras?.quotedTweet as { url?: unknown } | undefined;
  if (typeof rich?.url === "string" && rich.url.length > 0) return rich.url;
  const list = extras?.quotedTweets;
  if (Array.isArray(list) && list[0] && typeof list[0] === "object") {
    const url = (list[0] as { url?: unknown }).url;
    if (typeof url === "string" && url.length > 0) return url;
  }
  return undefined;
}
