import type { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import { markAtRisk, report } from "../../pipeline/rate-governor";
import { pickTitle } from "../harvest/lib/title";
import {
  buildSavedApiExpression,
  type SavedApiResult,
} from "../harvest/threads/api";
import { parseSavedResponses } from "../harvest/threads/graphql";
import {
  buildThreadsListExpression,
  THREADS_LIKES_URLS,
  THREADS_LIST_URL,
} from "../harvest/threads/list";
import type {
  SavedEntry,
  SavedHarvestArgs,
  SavedHarvestResult,
} from "../harvest/threads/saved-types";
import { NAV_TIMEOUT_MS } from "./constants";
import {
  looksLikeAuthWall,
  looksLikeChallenge,
  navigateWithTimeout,
} from "./navigation";
import { leaseWindow } from "./pool";
import { sleep } from "./util";

interface SavedHarvestProgress {
  phase: "hydrate" | "scroll";
  seen: number;
  fresh: number;
  articles: number;
  captures: number;
  scrolls: number;
}

export async function harvestThreadsSaved(
  args: SavedHarvestArgs,
  opts: {
    onProgress?: (p: SavedHarvestProgress) => void;
    partition?: string;
  } = {},
): Promise<SavedHarvestResult> {
  return harvestThreadsFeed(THREADS_LIST_URL, args, opts);
}

export async function harvestThreadsLikes(
  args: SavedHarvestArgs,
  opts: {
    onProgress?: (p: SavedHarvestProgress) => void;
    partition?: string;
  } = {},
): Promise<SavedHarvestResult> {
  let last: SavedHarvestResult = { ok: false, reason: "no_match" };
  for (const url of THREADS_LIKES_URLS) {
    last = await harvestThreadsFeed(url, args, opts);
    if (
      last.ok ||
      last.reason === "auth_required" ||
      last.reason === "rate_limited"
    ) {
      return last;
    }
  }
  return last;
}

async function harvestThreadsFeed(
  listUrl: string,
  args: SavedHarvestArgs,
  opts: {
    onProgress?: (p: SavedHarvestProgress) => void;
    partition?: string;
  } = {},
): Promise<SavedHarvestResult> {
  const lease = await leaseWindow("threads", { partition: opts.partition });
  try {
    const navOk = await navigateWithTimeout(lease.win, listUrl, NAV_TIMEOUT_MS);
    if (!navOk) return { ok: false, reason: "timeout" };
    const savedUrl = lease.win.webContents.getURL();
    const challenge = looksLikeChallenge(savedUrl);
    if (challenge) {
      markAtRisk(
        "threads",
        challenge.kind,
        `saved harvest landed on ${challenge.kind}`,
      );
      return { ok: false, reason: "auth_required" };
    }
    if (looksLikeAuthWall(savedUrl)) {
      return { ok: false, reason: "auth_required" };
    }

    try {
      await lease.win.webContents.executeJavaScript(
        "globalThis.__pondThreadsSavedRequest=null;globalThis.__pondThreadsSavedCaptures=[];",
        true,
      );
    } catch {
      /* hook may not be installed yet */
    }

    let lastSeen = -1;
    let lastPhase: SavedHarvestProgress["phase"] | null = null;
    let stopPolling = false;
    const pollInterval = setInterval(() => {
      if (stopPolling) return;
      void lease.win.webContents
        .executeJavaScript(
          "JSON.stringify(globalThis.__pondHarvestStats ?? null)",
          true,
        )
        .then((raw) => {
          if (typeof raw !== "string" || raw === "null") return;
          let stats: Omit<SavedHarvestProgress, "phase"> & {
            phase: "hydrate" | "scroll" | "done";
          };
          try {
            stats = JSON.parse(raw);
          } catch {
            return;
          }
          if (stats.phase === "done") return;
          const moved = stats.seen !== lastSeen || stats.phase !== lastPhase;
          if (!moved) return;
          lastSeen = stats.seen;
          lastPhase = stats.phase;
          opts.onProgress?.({
            phase: stats.phase,
            seen: stats.seen,
            fresh: stats.fresh,
            articles: stats.articles,
            captures: stats.captures,
            scrolls: stats.scrolls,
          });
        })
        .catch(() => {});
    }, 1500);

    const runExpr = (expr: string): Promise<unknown> =>
      Promise.race([
        lease.win.webContents.executeJavaScript(expr, true),
        sleep(6 * 60_000).then(() => "__pond_saved_timeout__"),
      ]);

    let result: Extract<SavedHarvestResult, { ok: true }>;
    try {
      const apiRaw = await runExpr(buildSavedApiExpression(args));
      if (apiRaw === "__pond_saved_timeout__") {
        log.warn("[pond threads-saved] api harvest timed out; falling back");
      }
      const api = (
        apiRaw && typeof apiRaw === "object" ? apiRaw : null
      ) as SavedApiResult | null;

      if (api?.ok) {
        log.info(
          `[pond threads-saved] api ok pages=${api.apiDebug?.pages ?? "?"} posts=${api.apiDebug?.posts ?? "?"} reason=${api.apiDebug?.reason ?? "?"}`,
        );
        report("threads", { ok: true });
        result = {
          ok: true,
          entries: api.entries,
          captures: api.captures,
          reachedEnd: api.reachedEnd,
        };
      } else if (api && api.reason === "auth_required") {
        return { ok: false, reason: "auth_required" };
      } else if (api && api.reason === "rate_limited") {
        const { cooldownMs } = report("threads", {
          ok: false,
          rateLimited: true,
          retryAfterSec: api.retryAfterSec ?? undefined,
        });
        log.warn(
          `[pond threads-saved] rate limited; backing off ${Math.round(cooldownMs / 1000)}s (no scroll fallback)`,
        );
        return {
          ok: false,
          reason: "rate_limited",
          retryAfterSec: api.retryAfterSec ?? undefined,
        };
      } else {
        log.info(
          `[pond threads-saved] api fallback (${api && "detail" in api ? api.detail : "timeout"}); scrolling`,
        );
        const scrollRaw = await runExpr(buildThreadsListExpression(args));
        if (scrollRaw === "__pond_saved_timeout__") {
          log.warn("[pond threads-saved] harvest timed out");
          return { ok: false, reason: "timeout" };
        }
        if (!scrollRaw || typeof scrollRaw !== "object") {
          return { ok: false, reason: "no_match" };
        }
        const scroll = scrollRaw as {
          ok?: boolean;
          reason?: SavedHarvestResult extends { ok: false }
            ? SavedHarvestResult["reason"]
            : never;
          entries?: Array<{
            sourceId: string;
            url: string;
            title?: string;
            description?: string;
            author?: string;
            mediaUrl?: string;
            mediaUrls?: SavedEntry["mediaUrls"];
          }>;
          reachedEnd?: boolean;
        };
        if (!scroll.ok) {
          return {
            ok: false,
            reason: scroll.reason ?? "no_match",
          };
        }
        const hookCaptures = await drainHookCaptures(lease.win);
        result = {
          ok: true,
          entries: (scroll.entries ?? []).map((e) => ({
            postId: e.sourceId,
            url: e.url,
            ...(e.title ? { title: e.title } : {}),
            ...(e.description ? { description: e.description } : {}),
            ...(e.author ? { author: e.author } : {}),
            ...(e.mediaUrl ? { mediaUrl: e.mediaUrl } : {}),
            ...(e.mediaUrls ? { mediaUrls: e.mediaUrls } : {}),
          })),
          captures: hookCaptures,
          reachedEnd: scroll.reachedEnd === true,
        };
      }
    } finally {
      stopPolling = true;
      clearInterval(pollInterval);
    }

    const rich = parseSavedResponses(result.captures);
    const seenIds = new Set<string>();
    const merged: SavedEntry[] = [];
    for (const entry of result.entries) {
      if (seenIds.has(entry.postId)) continue;
      seenIds.add(entry.postId);
      const r = rich.get(entry.postId);
      if (!r) {
        merged.push(entry);
        continue;
      }
      merged.push(enrichEntry(entry, r));
    }
    for (const [postId, r] of rich) {
      if (seenIds.has(postId)) continue;
      seenIds.add(postId);
      merged.push(enrichEntry({ postId, url: r.url }, r));
    }
    log.info(
      `[pond threads-saved] merged=${merged.length} captures=${result.captures.length}`,
    );
    return {
      ok: true,
      entries: merged,
      captures: result.captures,
      reachedEnd: result.reachedEnd,
    };
  } catch (err) {
    log.warn("[pond threads-saved] unexpected error", err);
    return { ok: false, reason: "timeout" };
  } finally {
    lease.release();
  }
}

function enrichEntry(
  entry: SavedEntry,
  r: NonNullable<SavedEntry["rich"]>,
): SavedEntry {
  const richMediaUrls = r.media.length > 0 ? r.media : entry.mediaUrls;
  return {
    ...entry,
    url: r.url || entry.url,
    title: pickTitle(r.fullText, entry.title) ?? undefined,
    description: r.fullText || entry.description,
    author: r.author.handle ? `@${r.author.handle}` : entry.author,
    mediaUrls: richMediaUrls,
    mediaUrl: r.media[0]?.url ?? entry.mediaUrl,
    rich: r,
  };
}

async function drainHookCaptures(
  win: BrowserWindow,
): Promise<import("../harvest/threads/graphql").SavedCapture[]> {
  try {
    const raw = await win.webContents.executeJavaScript(
      "JSON.stringify(globalThis.__pondThreadsSavedCaptures ?? [])",
      true,
    );
    if (typeof raw !== "string") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is { url: string; body: string; status?: number } =>
        !!c &&
        typeof c === "object" &&
        typeof (c as { url?: unknown }).url === "string" &&
        typeof (c as { body?: unknown }).body === "string",
    );
  } catch {
    return [];
  }
}
