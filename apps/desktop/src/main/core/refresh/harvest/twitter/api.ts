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
  /** HTTP 429 / exhausted budget: the caller must back off and must not escalate to the noisier scroll path. */
  | { ok: false; reason: "rate_limited"; retryAfterSec: number | null }
  | { ok: false; reason: "fallback"; detail: string };

const API_DEADLINE_MS = 5 * 60_000;
/** Throttle between pages; back-to-back requests with no gap trip a rate limit. */
const PAGE_THROTTLE_MS = 350;
const MAX_PAGES = 2000;

export function buildBookmarksApiExpression(
  args: BookmarksHarvestArgs,
): string {
  return buildTwitterListApiExpression(args, "bookmarks");
}

export function buildLikesApiExpression(args: BookmarksHarvestArgs): string {
  return buildTwitterListApiExpression(args, "likes");
}

function buildTwitterListApiExpression(
  args: BookmarksHarvestArgs,
  kind: "bookmarks" | "likes",
): string {
  const fnSrc = `(${inPageBookmarksApi.toString()})`;
  const enriched = {
    ...args,
    kind,
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
    kind?: "bookmarks" | "likes";
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

  const retryAfterFromHeaders = (res: Response): number | null => {
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) {
      const n = Number(retryAfter);
      if (Number.isFinite(n)) return Math.max(0, n);
      const when = Date.parse(retryAfter);
      if (Number.isFinite(when)) {
        return Math.max(0, Math.round((when - Date.now()) / 1000));
      }
    }
    const reset = res.headers.get("x-rate-limit-reset");
    if (reset) {
      const epoch = Number(reset);
      if (Number.isFinite(epoch)) {
        const ms = epoch > 1e12 ? epoch : epoch * 1000;
        return Math.max(0, Math.round((ms - Date.now()) / 1000));
      }
    }
    return null;
  };

  const getRequest = (): BookmarksRequestTemplate | null => {
    const g = globalThis as unknown as {
      __pondBookmarksRequest?: BookmarksRequestTemplate | null;
      __pondLikesRequest?: BookmarksRequestTemplate | null;
    };
    const req =
      args.kind === "likes" ? g.__pondLikesRequest : g.__pondBookmarksRequest;
    if (!req || typeof req.url !== "string" || req.url.length === 0) {
      return null;
    }
    return req;
  };

  let template = getRequest();
  const waitDeadline = Date.now() + 20_000;
  let nudged = false;
  while (!template && Date.now() < waitDeadline) {
    if (!nudged && Date.now() - (waitDeadline - 20_000) > 4_000) {
      nudged = true;
      try {
        window.scrollBy({ top: 600, behavior: "instant" as ScrollBehavior });
      } catch {}
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
  } catch {}

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(template.headers ?? {})) {
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
    const data = (json as { data?: Record<string, unknown> })?.data;
    if (!data || typeof data !== "object") return [];
    const bookmark = (
      data as {
        bookmark_timeline_v2?: { timeline?: { instructions?: unknown } };
      }
    ).bookmark_timeline_v2?.timeline?.instructions;
    if (Array.isArray(bookmark)) return bookmark as Instruction[];
    const user = (
      data as {
        user?: {
          result?: {
            timeline_v2?: { timeline?: { instructions?: unknown } };
            timeline?: { timeline?: { instructions?: unknown } };
          };
        };
      }
    ).user?.result;
    const v2 = user?.timeline_v2?.timeline?.instructions;
    if (Array.isArray(v2)) return v2 as Instruction[];
    const v1 = user?.timeline?.timeline?.instructions;
    return Array.isArray(v1) ? (v1 as Instruction[]) : [];
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
  const pageTweetIds = (json: unknown): string[] => {
    const ids: string[] = [];
    for (const ix of readInstructions(json)) {
      if (ix.type !== "TimelineAddEntries" || !Array.isArray(ix.entries)) {
        continue;
      }
      for (const e of ix.entries) {
        if (typeof e.entryId === "string" && e.entryId.startsWith("tweet-")) {
          ids.push(e.entryId.slice("tweet-".length));
        }
      }
    }
    return ids;
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
  const known = new Set<string>((args.knownIds ?? []).map(String));
  const earlyStopEnabled = known.size > 0;
  const STOP_AFTER_KNOWN_PAGES = 2;
  let knownPageStreak = 0;
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
      if (res.status === 429) {
        return {
          ok: false,
          reason: "rate_limited",
          retryAfterSec: retryAfterFromHeaders(res),
        };
      }
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

    if (earlyStopEnabled && tweets > 0) {
      const ids = pageTweetIds(json);
      const hasFresh = ids.some((id) => !known.has(id));
      if (!hasFresh) {
        knownPageStreak += 1;
        if (knownPageStreak >= STOP_AFTER_KNOWN_PAGES) {
          reason = "exhausted";
          break;
        }
      } else {
        knownPageStreak = 0;
      }
    }

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
