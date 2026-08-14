/// <reference lib="dom" />

import type { SavedCapture } from "./graphql";
import type { SavedHarvestArgs, SavedHarvestResult } from "./saved-types";

interface SavedRequestTemplate {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface SavedApiDebug {
  pages: number;
  posts: number;
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

export type SavedApiResult =
  | (SavedHarvestResult & { ok: true; apiDebug?: SavedApiDebug })
  | { ok: false; reason: "auth_required" }
  | { ok: false; reason: "rate_limited"; retryAfterSec: number | null }
  | { ok: false; reason: "fallback"; detail: string };

const API_DEADLINE_MS = 5 * 60_000;
const PAGE_THROTTLE_MS = 350;
const MAX_PAGES = 2000;

export function buildSavedApiExpression(args: SavedHarvestArgs): string {
  const fnSrc = `(${inPageSavedApi.toString()})`;
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

async function inPageSavedApi(
  args: SavedHarvestArgs & {
    deadlineMs: number;
    throttleMs: number;
    maxPages: number;
  },
): Promise<SavedApiResult> {
  if (
    location.pathname.startsWith("/login") ||
    location.pathname.includes("/accounts/login")
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
    return null;
  };

  const getRequest = (): SavedRequestTemplate | null => {
    const req = (
      globalThis as unknown as {
        __pondThreadsSavedRequest?: SavedRequestTemplate | null;
      }
    ).__pondThreadsSavedRequest;
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

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(template.headers ?? {})) {
    headers[k] = v;
  }
  if (!("accept" in headers)) headers.accept = "*/*";

  const parseVariables = (raw: string | null): Record<string, unknown> => {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };

  const asObj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};

  const form =
    template.body && !template.body.trim().startsWith("{")
      ? new URLSearchParams(template.body)
      : null;
  let jsonBody: Record<string, unknown> | null = null;
  if (template.body?.trim().startsWith("{")) {
    try {
      jsonBody = JSON.parse(template.body) as Record<string, unknown>;
    } catch {
      jsonBody = null;
    }
  }

  let baseVariables: Record<string, unknown> = {};
  const urlVars = base.searchParams.get("variables");
  if (urlVars) baseVariables = parseVariables(urlVars);
  else if (form?.get("variables")) {
    baseVariables = parseVariables(form.get("variables"));
  } else if (jsonBody?.variables) {
    baseVariables =
      typeof jsonBody.variables === "string"
        ? parseVariables(jsonBody.variables)
        : asObj(jsonBody.variables);
  }

  const buildRequest = (
    cursor: string | null,
  ): { url: string; body?: string } => {
    const vars = { ...baseVariables };
    if (cursor) {
      vars.after = cursor;
      vars.cursor = cursor;
    } else {
      delete vars.after;
      delete vars.cursor;
    }
    const method = (template.method || "GET").toUpperCase();
    if (method === "GET") {
      const u = new URL(base.toString());
      u.searchParams.set("variables", JSON.stringify(vars));
      return { url: u.toString() };
    }
    if (form) {
      const next = new URLSearchParams(form);
      next.set("variables", JSON.stringify(vars));
      return { url: base.toString(), body: next.toString() };
    }
    if (jsonBody) {
      const next = { ...jsonBody, variables: vars };
      return { url: base.toString(), body: JSON.stringify(next) };
    }
    return {
      url: base.toString(),
      body: JSON.stringify({ variables: vars }),
    };
  };

  const pageCursor = (json: unknown): string | null => {
    let found: string | null = null;
    const visit = (value: unknown): void => {
      if (found || !value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        for (const item of value) visit(item);
        return;
      }
      const obj = value as Record<string, unknown>;
      const info = asObj(obj.page_info);
      if (typeof info.end_cursor === "string" && info.end_cursor) {
        found = info.end_cursor;
        return;
      }
      for (const child of Object.values(obj)) visit(child);
    };
    visit(json);
    return found;
  };

  const pagePostIds = (json: unknown): string[] => {
    const ids: string[] = [];
    const seen = new Set<string>();
    const visit = (value: unknown, skip: boolean): void => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        for (const item of value) visit(item, skip);
        return;
      }
      const obj = value as Record<string, unknown>;
      const code = typeof obj.code === "string" ? obj.code : null;
      if (
        !skip &&
        code &&
        !seen.has(code) &&
        (obj.text_post_app_info || obj.user || obj.owner)
      ) {
        seen.add(code);
        ids.push(code);
      }
      for (const [key, child] of Object.entries(obj)) {
        const nestedSkip =
          skip ||
          key === "share_info" ||
          key === "quoted_post" ||
          key === "reposted_post";
        visit(child, nestedSkip);
      }
    };
    visit(json, false);
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

  const captures: SavedCapture[] = [];
  const deadline = Date.now() + args.deadlineMs;
  const known = new Set<string>((args.knownIds ?? []).map(String));
  const earlyStopEnabled = known.size > 0;
  const STOP_AFTER_KNOWN_PAGES = 2;
  let knownPageStreak = 0;
  let cursor: string | null =
    typeof baseVariables.after === "string"
      ? baseVariables.after
      : typeof baseVariables.cursor === "string"
        ? baseVariables.cursor
        : null;
  let prevCursor: string | null = null;
  let pages = 0;
  let postTotal = 0;
  let firstStatus: number | undefined;
  let reason: SavedApiDebug["reason"] = "exhausted";

  while (pages < args.maxPages && Date.now() < deadline) {
    const built = buildRequest(cursor);
    let res: Response;
    try {
      res = await fetch(built.url, {
        method: template.method || "POST",
        headers,
        credentials: "include",
        ...(built.body ? { body: built.body } : {}),
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

    const ids = pagePostIds(json);
    const next = pageCursor(json);
    captures.push({ url: built.url, body, status: res.status });
    pages += 1;
    postTotal += ids.length;

    const freshOnPage = ids.filter((id) => !known.has(id)).length;
    stats.seen = postTotal;
    stats.fresh += freshOnPage;
    stats.captures = pages;
    stats.scrolls = pages;
    stats.updatedAt = Date.now();

    if (earlyStopEnabled && ids.length > 0) {
      if (freshOnPage === 0) {
        knownPageStreak += 1;
        if (knownPageStreak >= STOP_AFTER_KNOWN_PAGES) {
          reason = "exhausted";
          break;
        }
      } else {
        knownPageStreak = 0;
      }
    }

    if (ids.length === 0) {
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

  if (pages === 1 && postTotal === 0) {
    return { ok: false, reason: "fallback", detail: "empty_first_page" };
  }

  stats.phase = "done";
  return {
    ok: true,
    entries: [],
    captures,
    reachedEnd: reason === "exhausted" || reason === "empty",
    apiDebug: { pages, posts: postTotal, reason, firstStatus },
  };
}
