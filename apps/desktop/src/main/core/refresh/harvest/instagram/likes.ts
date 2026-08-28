/// <reference lib="dom" />

import type {
  ListEntry,
  ListHarvestArgs,
  ListHarvestResult,
} from "../list-types";

export const INSTAGRAM_LIKES_URL =
  "https://www.instagram.com/your_activity/interactions/likes/";

declare global {
  var __pondIgBloksCaptures: string[] | undefined;
  var __pondHarvestPartial:
    | Array<{ sourceId: string; url: string }>
    | undefined;
}

interface LikesArgs extends ListHarvestArgs {
  deadlineMs: number;
  scrollPauseMs: number;
  maxScrolls: number;
}

const LIKES_DEADLINE_MS = 8 * 60_000;
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

/** `/api/v1/feed/liked/` answers "useragent mismatch" to any web session, so this reads the Bloks activity screen instead. */
async function inPageInstagramLikes(
  args: LikesArgs,
): Promise<ListHarvestResult> {
  if (
    location.pathname.startsWith("/accounts/login") ||
    location.pathname.startsWith("/login")
  ) {
    return { ok: false, reason: "auth_required" };
  }

  const ITEM_RE =
    /\(bk\.action\.array\.Make,\s*\\?"\d{6,25}_\d+\\?",\s*\\?"([A-Za-z0-9_-]{5,20})\\?",\s*\\?"([a-z_]+)\\?",\s*\(bk\.action\.i32\.Const,\s*(\d+)\)/g;

  const entries: ListEntry[] = [];
  const seen = new Set<string>();
  const known = new Set(args.knownIds.map(String));
  const earlyStopEnabled = args.earlyStop ?? known.size > 0;
  let knownRoundStreak = 0;

  interface DrainCount {
    added: number;
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
        if (!code || productType === "ad" || seen.has(code)) continue;
        seen.add(code);
        added += 1;
        if (!known.has(code)) fresh += 1;
        const isVideo = productType === "clips" || match[3] === "2";
        entries.push({
          sourceId: code,
          url: `https://www.instagram.com/${isVideo ? "reel" : "p"}/${code}/`,
          mediaType: isVideo ? "video" : "image",
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
