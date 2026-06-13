/// <reference lib="dom" />

import type { BookmarksCapture } from "./graphql";
import type { BookmarksHarvestArgs, BookmarksHarvestResult } from "./list";

interface BookmarksRequestTemplate {
  url: string;
  method: string;
  headers: Record<string, string>;
}

interface BookmarksApiDebug {
  pages: number;
  tweets: number;
  reason:
    | "auth_required"
    | "no_request"
    | "http_error"
    | "parse_error"
    | "empty"
    | "exhausted"
    | "deadline";
  firstStatus?: number;
}

export type BookmarksApiResult =
  | (BookmarksHarvestResult & { ok: true; apiDebug?: BookmarksApiDebug })
  | { ok: false; reason: "auth_required" }
  // The page never produced a usable Bookmarks request, or the very first
  // replay failed (stale transaction id, schema drift, …). Caller should
  // fall back to the scroll harvester.
  | { ok: false; reason: "fallback"; detail: string };

const API_DEADLINE_MS = 5 * 60_000;
// X tolerates the bookmark timeline being read quickly, but back-to-back
// requests with no gap is the fastest way to trip a rate limit. A short,
// jittered pause keeps us comfortably under the per-window budget while
// still draining thousands of bookmarks in well under a minute.
const PAGE_THROTTLE_MS = 350;
const MAX_PAGES = 2000;

export function buildBookmarksApiExpression(
  args: BookmarksHarvestArgs,
): string {
  const fnSrc = `(${inPageBookmarksApi.toString()})`;
  const enriched = {
    ...args,
    deadlineMs: API_DEADLINE_MS,
    throttleMs: PAGE_THROTTLE_MS,
    maxPages: MAX_PAGES,
  };
  return `(async () => {
    const args = ${JSON.stringify(enriched)};
    try { return await ${fnSrc}(args); }
    catch (e) { return { ok: false, reason: 'fallback', detail: 'threw:' + String(e) }; }
  })()`;
}

async function inPageBookmarksApi(
  args: BookmarksHarvestArgs & {
    deadlineMs: number;
    throttleMs: number;
    maxPages: number;
  },
): Promise<BookmarksApiResult> {
  if (
    location.pathname.startsWith("/i/flow/login") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/i/flow/signup")
  ) {
    return { ok: false, reason: "auth_required" };
  }

  const sleep = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));

  const getRequest = (): BookmarksRequestTemplate | null => {
    const req = (
      globalThis as unknown as {
        __pondBookmarksRequest?: BookmarksRequestTemplate | null;
      }
    ).__pondBookmarksRequest;
    if (!req || typeof req.url !== "string" || req.url.length === 0) {
      return null;
    }
    return req;
  };

  // The page fires its first Bookmarks request on mount. Wait for the
  // preload hook to capture it; nudge with a tiny scroll if it is slow.
  let template = getRequest();
  const waitDeadline = Date.now() + 20_000;
  let nudged = false;
  while (!template && Date.now() < waitDeadline) {
    if (!nudged && Date.now() - (waitDeadline - 20_000) > 4_000) {
      nudged = true;
      try {
        window.scrollBy({ top: 600, behavior: "instant" as ScrollBehavior });
      } catch {
        /* ignore */
      }
    }
    await sleep(250);
    template = getRequest();
  }
  if (!template) {
    return { ok: false, reason: "fallback", detail: "no_request" };
  }

  let base: URL;
  try {
    base = new URL(template.url, location.origin);
  } catch {
    return { ok: false, reason: "fallback", detail: "bad_url" };
  }

  let baseVariables: Record<string, unknown> = {};
  try {
    const raw = base.searchParams.get("variables");
    if (raw) baseVariables = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* keep defaults; cursor injection still works */
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(template.headers ?? {})) {
    // The browser silently drops forbidden request headers (host, origin,
    // user-agent, content-length, …); copying them is harmless, and the
    // ones X actually checks (authorization, x-csrf-token,
    // x-client-transaction-id, x-twitter-*) are all settable.
    headers[k] = v;
  }
  if (!("accept" in headers)) headers.accept = "*/*";

  const buildUrl = (cursor: string | null): string => {
    const vars = { ...baseVariables };
    if (cursor) vars.cursor = cursor;
    else delete vars.cursor;
    const u = new URL(base.toString());
    u.searchParams.set("variables", JSON.stringify(vars));
    return u.toString();
  };

  interface Instruction {
    type?: string;
    entries?: Array<{
      entryId?: string;
      content?: { value?: string };
    }>;
  }
  const readInstructions = (json: unknown): Instruction[] => {
    const ins = (
      json as {
        data?: {
          bookmark_timeline_v2?: { timeline?: { instructions?: unknown } };
        };
      }
    )?.data?.bookmark_timeline_v2?.timeline?.instructions;
    return Array.isArray(ins) ? (ins as Instruction[]) : [];
  };
  const extractCursor = (json: unknown): string | null => {
    for (const ix of readInstructions(json)) {
      if (ix.type !== "TimelineAddEntries" || !Array.isArray(ix.entries)) {
        continue;
      }
      for (const e of ix.entries) {
        if (
          typeof e.entryId === "string" &&
          e.entryId.startsWith("cursor-bottom") &&
          typeof e.content?.value === "string"
        ) {
          return e.content.value;
        }
      }
    }
    return null;
  };
  const countTweets = (json: unknown): number => {
    let n = 0;
    for (const ix of readInstructions(json)) {
      if (ix.type !== "TimelineAddEntries" || !Array.isArray(ix.entries)) {
        continue;
      }
      for (const e of ix.entries) {
        if (typeof e.entryId === "string" && e.entryId.startsWith("tweet-")) {
          n += 1;
        }
      }
    }
    return n;
  };

  const stats = {
    seen: 0,
    fresh: 0,
    articles: 0,
    captures: 0,
    scrolls: 0,
    phase: "scroll" as "hydrate" | "scroll" | "done",
    updatedAt: Date.now(),
  };
  (
    globalThis as unknown as { __pondHarvestStats?: typeof stats }
  ).__pondHarvestStats = stats;

  const captures: BookmarksCapture[] = [];
  const deadline = Date.now() + args.deadlineMs;
  let cursor: string | null =
    typeof baseVariables.cursor === "string" ? baseVariables.cursor : null;
  let prevCursor: string | null = null;
  let pages = 0;
  let tweetTotal = 0;
  let firstStatus: number | undefined;
  let reason: BookmarksApiDebug["reason"] = "exhausted";

  while (pages < args.maxPages && Date.now() < deadline) {
    const url = buildUrl(cursor);
    let res: Response;
    try {
      res = await fetch(url, {
        method: template.method || "GET",
        headers,
        credentials: "include",
      });
    } catch {
      if (pages === 0) {
        return { ok: false, reason: "fallback", detail: "fetch_threw" };
      }
      reason = "http_error";
      break;
    }
    if (pages === 0) firstStatus = res.status;
    if (!res.ok) {
      if (pages === 0) {
        return {
          ok: false,
          reason: "fallback",
          detail: `http_${res.status}`,
        };
      }
      reason = "http_error";
      break;
    }

    const body = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      if (pages === 0) {
        return { ok: false, reason: "fallback", detail: "parse_error" };
      }
      reason = "parse_error";
      break;
    }

    const tweets = countTweets(json);
    const next = extractCursor(json);
    captures.push({ url, body, status: res.status });
    pages += 1;
    tweetTotal += tweets;

    stats.seen = tweetTotal;
    stats.captures = pages;
    stats.scrolls = pages;
    stats.updatedAt = Date.now();

    if (tweets === 0) {
      reason = pages === 1 ? "empty" : "exhausted";
      break;
    }
    if (!next || next === cursor || next === prevCursor) {
      reason = "exhausted";
      break;
    }
    prevCursor = cursor;
    cursor = next;
    await sleep(args.throttleMs + Math.random() * 150);
  }

  if (Date.now() >= deadline) reason = "deadline";

  // First page returned zero tweets via the API but the account may simply
  // have rendered everything client-side already; hand off to the scroll
  // harvester rather than reporting an empty library.
  if (pages === 1 && tweetTotal === 0) {
    return { ok: false, reason: "fallback", detail: "empty_first_page" };
  }

  stats.phase = "done";
  return {
    ok: true,
    entries: [],
    captures,
    reachedEnd: reason === "exhausted" || reason === "empty",
    apiDebug: { pages, tweets: tweetTotal, reason, firstStatus },
  };
}
