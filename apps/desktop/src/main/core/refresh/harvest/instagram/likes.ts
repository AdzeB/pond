/// <reference lib="dom" />

import type { MediaType } from "@pond/schema/db";
import type {
  ListEntry,
  ListHarvestArgs,
  ListHarvestResult,
} from "../list-types";

export const INSTAGRAM_LIKES_URL =
  "https://www.instagram.com/your_activity/interactions/likes/";

declare global {
  /** The scrape preload buffers every Bloks response the activity screen fetches. */
  var __pondIgBloksCaptures: string[] | undefined;
  /** What the harvest has collected so far, for the timeout recovery path. */
  var __pondHarvestPartial:
    | Array<{ sourceId: string; url: string }>
    | undefined;
}

interface LikesArgs extends ListHarvestArgs {
  deadlineMs: number;
  scrollPauseMs: number;
  maxScrolls: number;
}

/** Instagram's sync watchdog is 20 min and the saved feed takes up to 5, so this fits inside it. */
const LIKES_DEADLINE_MS = 8 * 60_000;
/** One scroll triggers one `liked_next` fetch, so this is the gap between requests. */
const SCROLL_PAUSE_MS = 900;
const MAX_SCROLLS = 600;

export function buildInstagramLikesExpression(args: ListHarvestArgs): string {
  const fnSrc = `(${inPageInstagramLikes.toString()})`;
  const enriched: LikesArgs = {
    ...args,
    deadlineMs: LIKES_DEADLINE_MS,
    scrollPauseMs: SCROLL_PAUSE_MS,
    maxScrolls: MAX_SCROLLS,
  };
  return `(async () => {
    const args = ${JSON.stringify(enriched)};
    try { return await ${fnSrc}(args); }
    catch (e) { return { ok: false, reason: 'timeout', error: String(e) }; }
  })()`;
}

/**
 * Instagram's likes list is a Bloks screen, not a REST feed: `/api/v1/feed/liked/` answers
 * "useragent mismatch" to anything but the native app. The screen itself pages through
 * `/async/wbloks/fetch/`, so this scrolls it and reads the tiles out of those payloads.
 */
async function inPageInstagramLikes(
  args: LikesArgs,
): Promise<ListHarvestResult> {
  if (
    location.pathname.startsWith("/accounts/login") ||
    location.pathname.startsWith("/login")
  ) {
    return { ok: false, reason: "auth_required" };
  }

  /** Each tile is a Bloks array literal: media id, shortcode, product type, then media type. */
  const ITEM_RE =
    /\(bk\.action\.array\.Make,\s*\\?"\d{6,25}_\d+\\?",\s*\\?"([A-Za-z0-9_-]{5,20})\\?",\s*\\?"([a-z_]+)\\?",\s*\(bk\.action\.i32\.Const,\s*(\d+)\)/g;

  const entries: ListEntry[] = [];
  const seen = new Set<string>();
  const known = new Set(args.knownIds.map(String));
  const earlyStopEnabled = args.earlyStop ?? known.size > 0;
  let knownRoundStreak = 0;

  function mediaTypeOf(productType: string, code: number): MediaType {
    if (productType === "clips" || code === 2) return "video";
    return "image";
  }

  interface DrainCount {
    added: number;
    /** How many of the newly seen tiles are not already in the library. */
    fresh: number;
  }

  function drain(): DrainCount {
    const buf = globalThis.__pondIgBloksCaptures;
    if (!Array.isArray(buf) || buf.length === 0) return { added: 0, fresh: 0 };
    let added = 0;
    let fresh = 0;
    for (const text of buf.splice(0)) {
      for (const match of text.matchAll(ITEM_RE)) {
        const code = match[1];
        const productType = match[2] ?? "";
        /** Sponsored posts are not addressable at /p/<code>/, so they are not savable. */
        if (!code || productType === "ad" || seen.has(code)) continue;
        seen.add(code);
        added += 1;
        if (!known.has(code)) fresh += 1;
        const kind = productType === "clips" ? "reel" : "p";
        entries.push({
          sourceId: code,
          url: `https://www.instagram.com/${kind}/${code}/`,
          mediaType: mediaTypeOf(productType, Number(match[3])),
        });
      }
    }
    return { added, fresh };
  }

  function findScroller(): HTMLElement | null {
    for (const el of document.querySelectorAll<HTMLElement>("div")) {
      const style = getComputedStyle(el);
      if (
        /auto|scroll/.test(style.overflowY) &&
        el.scrollHeight > el.clientHeight + 40
      ) {
        return el;
      }
    }
    return null;
  }

  function publish(): void {
    globalThis.__pondHarvestPartial = entries.map((e) => ({
      sourceId: e.sourceId,
      url: e.url,
    }));
  }

  const hydrateDeadline = Date.now() + 20_000;
  while (Date.now() < hydrateDeadline) {
    if (drain().added > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (entries.length === 0) {
    /** No tiles at all: an empty likes list and a screen that never loaded look the same here. */
    return { ok: true, entries: [], reachedEnd: true, seen: 0 };
  }
  publish();

  const deadline = Date.now() + args.deadlineMs;
  let stableRounds = 0;
  for (let scrolls = 0; scrolls < args.maxScrolls; scrolls++) {
    if (Date.now() > deadline || globalThis.__pondHarvestAbort) {
      return { ok: true, entries, reachedEnd: false, seen: entries.length };
    }
    const scroller = findScroller();
    if (!scroller) break;
    scroller.scrollTop = scroller.scrollHeight;
    await new Promise((r) => setTimeout(r, args.scrollPauseMs));

    const { added, fresh } = drain();
    publish();
    if (added === 0) {
      stableRounds += 1;
      if (stableRounds >= 3) {
        return { ok: true, entries, reachedEnd: true, seen: entries.length };
      }
      continue;
    }
    stableRounds = 0;
    if (!earlyStopEnabled) continue;
    knownRoundStreak = fresh === 0 ? knownRoundStreak + 1 : 0;
    if (knownRoundStreak >= 2) {
      return { ok: true, entries, reachedEnd: true, seen: entries.length };
    }
  }
  return { ok: true, entries, reachedEnd: false, seen: entries.length };
}
