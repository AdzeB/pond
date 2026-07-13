import log from "electron-log/main.js";
import { markAtRisk, report } from "../../pipeline/rate-governor";
import {
  type BookmarksApiResult,
  type BookmarksEntry,
  type BookmarksHarvestArgs,
  type BookmarksHarvestResult,
  buildBookmarksApiExpression,
  buildBookmarksExpression,
  parseBookmarksResponses,
} from "../harvest/twitter";
import { NAV_TIMEOUT_MS } from "./constants";
import {
  looksLikeAuthWall,
  looksLikeChallenge,
  navigateWithTimeout,
} from "./navigation";
import { leaseWindow } from "./pool";
import { sleep } from "./util";

interface BookmarksHarvestProgress {
  phase: "hydrate" | "scroll";
  seen: number;
  fresh: number;
  articles: number;
  captures: number;
  scrolls: number;
}

export async function harvestTwitterBookmarks(
  args: BookmarksHarvestArgs,
  opts: {
    onProgress?: (p: BookmarksHarvestProgress) => void;
    /** Session partition of the account being synced. */
    partition?: string;
  } = {},
): Promise<BookmarksHarvestResult> {
  const lease = await leaseWindow("twitter", { partition: opts.partition });
  try {
    const navOk = await navigateWithTimeout(
      lease.win,
      "https://x.com/i/bookmarks",
      NAV_TIMEOUT_MS,
    );
    if (!navOk) return { ok: false, reason: "timeout" };
    const bookmarksUrl = lease.win.webContents.getURL();
    const bookmarksChallenge = looksLikeChallenge(bookmarksUrl);
    if (bookmarksChallenge) {
      markAtRisk(
        "twitter",
        bookmarksChallenge.kind,
        `bookmarks harvest landed on ${bookmarksChallenge.kind}`,
      );
      return { ok: false, reason: "auth_required" };
    }
    if (looksLikeAuthWall(bookmarksUrl)) {
      return { ok: false, reason: "auth_required" };
    }

    let lastSeen = -1;
    let lastPhase: BookmarksHarvestProgress["phase"] | null = null;
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
          let stats: Omit<BookmarksHarvestProgress, "phase"> & {
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
        sleep(6 * 60_000).then(() => "__pond_bookmarks_timeout__"),
      ]);

    let result: Extract<BookmarksHarvestResult, { ok: true }>;
    try {
      /** Replay the page's own Bookmarks GraphQL request; fall back to scroll-and-scrape. */
      const apiRaw = await runExpr(buildBookmarksApiExpression(args));
      if (apiRaw === "__pond_bookmarks_timeout__") {
        log.warn("[pond bookmarks] api harvest timed out; falling back");
      }
      const api = (
        apiRaw && typeof apiRaw === "object" ? apiRaw : null
      ) as BookmarksApiResult | null;

      if (api?.ok) {
        log.info(
          `[pond bookmarks] api ok pages=${api.apiDebug?.pages ?? "?"} tweets=${api.apiDebug?.tweets ?? "?"} reason=${api.apiDebug?.reason ?? "?"}`,
        );
        report("twitter", { ok: true });
        result = {
          ok: true,
          entries: api.entries,
          captures: api.captures,
          reachedEnd: api.reachedEnd,
        };
      } else if (api && api.reason === "auth_required") {
        return { ok: false, reason: "auth_required" };
      } else if (api && api.reason === "rate_limited") {
        /** Set the governor cooldown and stop; scroll fallback hits the live timeline harder and risks the account further. */
        const { cooldownMs } = report("twitter", {
          ok: false,
          rateLimited: true,
          retryAfterSec: api.retryAfterSec ?? undefined,
        });
        log.warn(
          `[pond bookmarks] rate limited; backing off ${Math.round(cooldownMs / 1000)}s (no scroll fallback)`,
        );
        return {
          ok: false,
          reason: "rate_limited",
          retryAfterSec: api.retryAfterSec ?? undefined,
        };
      } else {
        log.info(
          `[pond bookmarks] api fallback (${api && "detail" in api ? api.detail : "timeout"}); scrolling`,
        );
        const scrollRaw = await runExpr(buildBookmarksExpression(args));
        if (scrollRaw === "__pond_bookmarks_timeout__") {
          log.warn("[pond bookmarks] harvest timed out");
          return { ok: false, reason: "timeout" };
        }
        if (!scrollRaw || typeof scrollRaw !== "object") {
          return { ok: false, reason: "no_match" };
        }
        const scrollResult = scrollRaw as BookmarksHarvestResult;
        if (!scrollResult.ok) return scrollResult;
        result = scrollResult;
      }
    } finally {
      stopPolling = true;
      clearInterval(pollInterval);
    }

    const rich = parseBookmarksResponses(result.captures);
    const seenTweetIds = new Set<string>();
    const merged: BookmarksEntry[] = [];
    for (const entry of result.entries) {
      if (seenTweetIds.has(entry.tweetId)) continue;
      seenTweetIds.add(entry.tweetId);
      const r = rich.get(entry.tweetId);
      if (!r) {
        merged.push(entry);
        continue;
      }
      const firstLine = r.fullText.split(/\n+/)[0]?.trim() ?? "";
      const richTitle =
        firstLine.length === 0
          ? entry.title
          : firstLine.length <= 90
            ? firstLine
            : `${firstLine.slice(0, 89).trimEnd()}…`;
      merged.push({
        ...entry,
        title: richTitle ?? entry.title,
        description: r.fullText || entry.description,
        author: r.author.handle ? `@${r.author.handle}` : entry.author,
        mediaUrls: r.media.length > 0 ? r.media : entry.mediaUrls,
        mediaUrl: r.media[0]?.url ?? entry.mediaUrl,
        rich: r,
      });
    }
    for (const [tweetId, r] of rich) {
      if (seenTweetIds.has(tweetId)) continue;
      seenTweetIds.add(tweetId);
      const firstLine = r.fullText.split(/\n+/)[0]?.trim() ?? "";
      const richTitle =
        firstLine.length === 0
          ? undefined
          : firstLine.length <= 90
            ? firstLine
            : `${firstLine.slice(0, 89).trimEnd()}…`;
      const richMediaUrls = r.media.length > 0 ? r.media : undefined;
      const entry: BookmarksEntry = {
        tweetId,
        url: r.url,
        ...(r.bookmarkedAt ? { bookmarkedAt: r.bookmarkedAt } : {}),
        ...(richTitle ? { title: richTitle } : {}),
        ...(r.fullText ? { description: r.fullText } : {}),
        ...(r.author.handle ? { author: `@${r.author.handle}` } : {}),
        ...(richMediaUrls ? { mediaUrls: richMediaUrls } : {}),
        ...(r.media[0]?.url ? { mediaUrl: r.media[0].url } : {}),
        rich: r,
      };
      merged.push(entry);
    }
    log.info(
      `[pond bookmarks] DOM=${result.entries.length} rich=${rich.size} merged=${merged.length} captures=${result.captures.length}`,
    );
    return {
      ok: true,
      entries: merged,
      captures: result.captures,
      reachedEnd: result.reachedEnd,
    };
  } catch (err) {
    log.warn("[pond bookmarks] unexpected error", err);
    return { ok: false, reason: "timeout" };
  } finally {
    lease.release();
  }
}
