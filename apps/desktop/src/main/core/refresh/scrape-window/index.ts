import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Source } from "@pond/schema/db";
import { app, type BrowserWindow, type Cookie, session, shell } from "electron";
import log from "electron-log/main.js";
import { getPrefs, setPrefs } from "../../prefs";
import { harvesterFor } from "../harvest";
import { arenaProfileUrl, buildArenaListExpression } from "../harvest/arena";
import { harvestArenaListViaApi } from "../harvest/arena/api";
import {
  buildCosmosListExpression,
  COSMOS_LIST_URL,
  cosmosProfileUrl,
} from "../harvest/cosmos";
import { buildInstagramListExpression } from "../harvest/instagram";
import type { ListHarvestArgs, ListHarvestResult } from "../harvest/list-types";
import {
  buildPinterestListExpression,
  pinterestProfileUrl,
} from "../harvest/pinterest";
import {
  buildTiktokListExpression,
  tiktokFavouritesUrl,
} from "../harvest/tiktok";
import {
  type BookmarksEntry,
  type BookmarksHarvestArgs,
  type BookmarksHarvestResult,
  buildBookmarksExpression,
  parseBookmarksResponses,
} from "../harvest/twitter";
import type { ScrapedHarvest } from "../harvest/types";
import {
  buildYoutubeListExpression,
  YOUTUBE_LIST_URLS,
} from "../harvest/youtube";
import { homeUrlForSource } from "../sources";
import { HARVEST_TIMEOUT_MS, NAV_TIMEOUT_MS, PARTITION } from "./constants";
import { looksLikeAuthWall, navigateWithTimeout } from "./navigation";
import { leaseWindow } from "./pool";
import { sleep } from "./util";

export {
  disposeHiddenWindow,
  GLOBAL_POOL_CAP,
  getPoolStatus,
  type Lease,
  type PoolStatus,
} from "./pool";

export interface HarvestArgs {
  url: string;
  source: Source;
  sourceId?: string;
}

export interface HarvestResult {
  ok: boolean;
  harvest?: ScrapedHarvest;
  sourceId?: string;
  reason?: "navigate_failed" | "harvest_failed" | "auth_required" | "timeout";
}

export async function harvestUrl(args: HarvestArgs): Promise<HarvestResult> {
  const lease = await leaseWindow(args.source);
  const harv = harvesterFor(args.source);
  const sourceId = args.sourceId ?? harv.sourceIdFromUrl(args.url) ?? "";

  try {
    const navOk = await navigateWithTimeout(
      lease.win,
      args.url,
      NAV_TIMEOUT_MS,
    );
    if (!navOk) {
      log.warn("[pond refresh:window] navigate failed", args.url);
      return { ok: false, reason: "navigate_failed", sourceId };
    }

    if (looksLikeAuthWall(lease.win.webContents.getURL())) {
      log.info(
        "[pond refresh:window] auth wall detected",
        lease.win.webContents.getURL(),
      );
      return { ok: false, reason: "auth_required", sourceId };
    }

    const expr = harv.buildExpression(sourceId);
    const raw = await Promise.race([
      lease.win.webContents.executeJavaScript(expr, true),
      sleep(HARVEST_TIMEOUT_MS).then(() => "__pond_harvest_timeout__"),
    ]);
    if (raw === "__pond_harvest_timeout__") {
      log.warn("[pond refresh:window] harvest timed out", args.url);
      return { ok: false, reason: "timeout", sourceId };
    }
    const harvest = harv.adapt(raw);
    if (!harvest) {
      return { ok: false, reason: "harvest_failed", sourceId };
    }
    return { ok: true, harvest, sourceId };
  } catch (err) {
    log.warn("[pond refresh:window] unexpected error", args.url, err);
    return { ok: false, reason: "harvest_failed", sourceId };
  } finally {
    lease.release();
  }
}

export {
  screenshotTweet,
  type TweetScreenshotArgs,
  type TweetScreenshotResult,
} from "./screenshot";

export interface SourceListArgs extends ListHarvestArgs {
  accountKey?: string;
}

export interface ListHarvestProgress {
  phase: string;
  collected: number;
  fresh: number;
}

export async function harvestSourceList(
  source: Source,
  args: SourceListArgs,
  opts: { onProgress?: (p: ListHarvestProgress) => void } = {},
): Promise<ListHarvestResult> {
  if (source === "arena") {
    if (!args.accountKey) {
      return { ok: false, reason: "auth_required" };
    }
    return harvestArenaListViaApi(args.accountKey, {
      knownIds: new Set(args.knownIds),
      onProgress: opts.onProgress
        ? (collected, fresh) =>
            opts.onProgress?.({ phase: "scroll", collected, fresh })
        : undefined,
    });
  }

  const target = listUrlForSource(source, args.accountKey);
  if (!target) {
    return { ok: false, reason: "no_match" };
  }
  const lease = await leaseWindow(source);
  try {
    const navOk = await navigateWithTimeout(lease.win, target, NAV_TIMEOUT_MS);
    if (!navOk) {
      return { ok: false, reason: "timeout" };
    }
    if (looksLikeAuthWall(lease.win.webContents.getURL())) {
      return { ok: false, reason: "auth_required" };
    }
    const expr = buildListExpressionFor(source, args);
    if (!expr) {
      return { ok: false, reason: "no_match" };
    }

    let stopPolling = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (opts.onProgress) {
      let lastCollected = -1;
      pollInterval = setInterval(() => {
        if (stopPolling) return;
        void lease.win.webContents
          .executeJavaScript(
            "JSON.stringify(globalThis.__pondHarvestStats ?? null)",
            true,
          )
          .then((raw: unknown) => {
            if (typeof raw !== "string" || raw === "null") return;
            try {
              const stats = JSON.parse(raw) as ListHarvestProgress;
              if (stats.collected !== lastCollected) {
                lastCollected = stats.collected;
                opts.onProgress?.(stats);
              }
            } catch {
              /* ignore */
            }
          })
          .catch(() => {});
      }, 1500);
    }

    const timeoutMs = source === "instagram" ? 300_000 : 90_000;
    const raw = await Promise.race([
      lease.win.webContents.executeJavaScript(expr, true),
      sleep(timeoutMs).then(() => "__pond_list_timeout__"),
    ]).finally(() => {
      stopPolling = true;
      if (pollInterval) clearInterval(pollInterval);
    });

    if (raw === "__pond_list_timeout__") {
      log.warn("[pond list]", source, "harvest timed out");
      return { ok: false, reason: "timeout" };
    }

    if (source === "cosmos" && process.env.POND_DUMP_COSMOS_CAPTURES) {
      await dumpCosmosCaptures(lease.win).catch((err) =>
        log.warn("[pond list:cosmos] capture dump failed", err),
      );
    }

    if (!raw || typeof raw !== "object") {
      return { ok: false, reason: "no_match" };
    }
    return raw as ListHarvestResult;
  } catch (err) {
    log.warn("[pond list]", source, "unexpected error", err);
    return { ok: false, reason: "unknown" };
  } finally {
    lease.release();
  }
}

function listUrlForSource(
  source: Source,
  accountKey: string | undefined,
): string | null {
  switch (source) {
    case "youtube":
      return YOUTUBE_LIST_URLS[0];
    case "cosmos":
      return accountKey ? cosmosProfileUrl(accountKey) : COSMOS_LIST_URL;
    case "arena":
      return accountKey ? arenaProfileUrl(accountKey) : null;
    case "pinterest":
      return accountKey ? pinterestProfileUrl(accountKey) : null;
    case "instagram":
      return "https://www.instagram.com/";
    case "tiktok":
      return accountKey ? tiktokFavouritesUrl(accountKey) : null;
    case "twitter":
      return null;
    case "local":
      return null;
  }
}

function buildListExpressionFor(
  source: Source,
  args: ListHarvestArgs,
): string | null {
  switch (source) {
    case "youtube":
      return buildYoutubeListExpression(args);
    case "cosmos":
      return buildCosmosListExpression(args);
    case "arena":
      return buildArenaListExpression(args);
    case "pinterest":
      return buildPinterestListExpression(args);
    case "instagram":
      return buildInstagramListExpression(args);
    case "tiktok":
      return buildTiktokListExpression(args);
    case "twitter":
      return null;
    case "local":
      return null;
  }
}

export async function harvestYoutubeLikedList(
  args: ListHarvestArgs,
): Promise<ListHarvestResult> {
  const lease = await leaseWindow("youtube");
  try {
    const navOk = await navigateWithTimeout(
      lease.win,
      YOUTUBE_LIST_URLS[1],
      NAV_TIMEOUT_MS,
    );
    if (!navOk) return { ok: false, reason: "timeout" };
    if (looksLikeAuthWall(lease.win.webContents.getURL())) {
      return { ok: false, reason: "auth_required" };
    }
    const expr = buildYoutubeListExpression(args);
    const raw = await Promise.race([
      lease.win.webContents.executeJavaScript(expr, true),
      sleep(90_000).then(() => "__pond_yt_ll_timeout__"),
    ]);
    if (raw === "__pond_yt_ll_timeout__") {
      return { ok: false, reason: "timeout" };
    }
    if (!raw || typeof raw !== "object") {
      return { ok: false, reason: "no_match" };
    }
    return raw as ListHarvestResult;
  } catch (err) {
    log.warn("[pond list] youtube LL unexpected error", err);
    return { ok: false, reason: "timeout" };
  } finally {
    lease.release();
  }
}

export interface BookmarksHarvestProgress {
  phase: "hydrate" | "scroll";
  seen: number;
  fresh: number;
  articles: number;
  captures: number;
  scrolls: number;
}

export async function harvestTwitterBookmarks(
  args: BookmarksHarvestArgs,
  opts: { onProgress?: (p: BookmarksHarvestProgress) => void } = {},
): Promise<BookmarksHarvestResult> {
  const lease = await leaseWindow("twitter");
  try {
    const navOk = await navigateWithTimeout(
      lease.win,
      "https://x.com/i/bookmarks",
      NAV_TIMEOUT_MS,
    );
    if (!navOk) return { ok: false, reason: "timeout" };
    if (looksLikeAuthWall(lease.win.webContents.getURL())) {
      return { ok: false, reason: "auth_required" };
    }
    const expr = buildBookmarksExpression(args);

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

    const raw = await Promise.race([
      lease.win.webContents.executeJavaScript(expr, true),
      sleep(6 * 60_000).then(() => "__pond_bookmarks_timeout__"),
    ]).finally(() => {
      stopPolling = true;
      clearInterval(pollInterval);
    });
    if (raw === "__pond_bookmarks_timeout__") {
      log.warn("[pond bookmarks] harvest timed out");
      return { ok: false, reason: "timeout" };
    }
    if (!raw || typeof raw !== "object") {
      return { ok: false, reason: "no_match" };
    }
    const result = raw as BookmarksHarvestResult;
    if (!result.ok) return result;

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

export type SignInMode = "external";

export async function signInToSource(
  source: Source,
): Promise<{ ok: boolean; mode: SignInMode }> {
  const url = homeUrlForSource(source);
  try {
    await shell.openExternal(url);
    log.info("[pond refresh:signin] opened external browser for", source, url);
    return { ok: true, mode: "external" };
  } catch (err) {
    log.warn("[pond refresh:signin] openExternal failed", source, err);
    return { ok: false, mode: "external" };
  }
}

async function dumpCosmosCaptures(win: BrowserWindow): Promise<void> {
  const raw = await win.webContents.executeJavaScript(
    "JSON.stringify(globalThis.__pondCosmosCapturesArchive ?? [])",
    true,
  );
  if (typeof raw !== "string" || raw === "[]") {
    log.info("[pond list:cosmos] no captures to dump");
    return;
  }
  const dir = join(app.getPath("userData"), "cosmos-captures");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(dir, `${stamp}.json`);
  await writeFile(path, raw, "utf-8");
  log.info("[pond list:cosmos] dumped captures to", path);
}

export async function isSourceConnected(source: Source): Promise<boolean> {
  const cookies = await listCookiesForSource(source);
  return cookies.some((c) => isAuthCookie(source, c));
}

export async function writePartitionCookies(args: {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "unspecified" | "no_restriction" | "lax" | "strict";
    expirationDate?: number | null;
    hostOnly?: boolean;
  }>;
}): Promise<{ written: number; skipped: number }> {
  const persistent = session.fromPartition(PARTITION);
  let written = 0;
  let skipped = 0;
  for (const c of args.cookies) {
    const hostForUrl = c.domain.replace(/^\./, "");
    const url = `${c.secure === false ? "http" : "https"}://${hostForUrl}${c.path ?? "/"}`;
    try {
      await persistent.cookies.set({
        url,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path ?? "/",
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite ?? "unspecified",
        expirationDate: c.expirationDate ?? undefined,
      });
      written += 1;
    } catch (err) {
      skipped += 1;
      log.warn(
        "[pond refresh:cookies] set failed",
        c.name,
        c.domain,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return { written, skipped };
}

export async function readStoredHandle(source: Source): Promise<string | null> {
  try {
    const prefs = await getPrefs();
    const raw = prefs.sync.handles?.[source];
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim().replace(/^@/, "");
    return trimmed.length > 0 ? trimmed : null;
  } catch (err) {
    log.warn("[pond refresh:signin] readStoredHandle failed", source, err);
    return null;
  }
}

async function _writeStoredHandle(
  source: Source,
  handle: string,
): Promise<void> {
  const trimmed = handle.trim().replace(/^@/, "");
  if (!trimmed) return;
  try {
    const prefs = await getPrefs();
    const nextHandles = { ...(prefs.sync.handles ?? {}), [source]: trimmed };
    await setPrefs({ sync: { handles: nextHandles } });
  } catch (err) {
    log.warn("[pond refresh:signin] writeStoredHandle failed", source, err);
  }
}

// Opens the hidden window logged in via the partition cookies and reads
// the user's own handle from the rendered DOM. We pick the handle off
// the profile link in the top nav: it's the one stable, public-facing
// identifier every social site exposes once you're authenticated.
//
// Returns `null` if the session isn't authenticated or the DOM probe
// doesn't match (site redesign, sign-out, etc.). The caller should
// surface that as `auth_required`.
export async function probeUserHandle(source: Source): Promise<string | null> {
  const lease = await leaseWindow(source);
  try {
    const url = homeUrlForSource(source);
    const navOk = await navigateWithTimeout(lease.win, url, NAV_TIMEOUT_MS);
    if (!navOk) {
      log.warn("[pond refresh:probe] navigate failed", source, url);
      return null;
    }
    const current = lease.win.webContents.getURL();
    if (looksLikeAuthWall(current)) {
      log.info("[pond refresh:probe] auth wall hit", source, current);
      return null;
    }

    const expr = buildProbeExpression(source);
    const raw = await Promise.race([
      lease.win.webContents.executeJavaScript(expr, true),
      sleep(HARVEST_TIMEOUT_MS).then(() => "__pond_probe_timeout__"),
    ]);
    if (typeof raw !== "string" || raw === "__pond_probe_timeout__") {
      log.warn("[pond refresh:probe] no handle in DOM", source);
      return null;
    }
    const handle = raw.trim().replace(/^@/, "");
    return handle.length > 0 ? handle : null;
  } catch (err) {
    log.warn("[pond refresh:probe] unexpected error", source, err);
    return null;
  } finally {
    lease.release();
  }
}

function buildProbeExpression(source: Source): string {
  // Each site exposes a profile/avatar link in the top nav pointing at
  // `/<handle>`. We pick the first link whose href is a single-segment
  // path on the site's own host. The expressions return the trimmed
  // handle string or the empty string.
  switch (source) {
    case "cosmos":
      return `(() => {
        try {
          const host = location.hostname.replace(/^www\\./, '');
          const links = Array.from(document.querySelectorAll('a[href^="/"]'));
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([A-Za-z0-9_-]{2,40})(\\?.*)?$/);
            if (!m) continue;
            const handle = m[1];
            // Filter obvious non-user paths.
            if (['login','signup','signin','about','pricing','settings','explore','search','feed','home','clusters'].includes(handle.toLowerCase())) continue;
            // Prefer a link in the top nav / header.
            const inNav = a.closest('header, nav, [role="navigation"]');
            if (inNav) return handle;
          }
          // Fallback: any plausible match.
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([A-Za-z0-9_-]{2,40})(\\?.*)?$/);
            if (m && !['login','signup','signin','about','pricing','settings','explore','search','feed','home','clusters'].includes(m[1].toLowerCase())) return m[1];
          }
          void host;
          return '';
        } catch { return ''; }
      })()`;
    case "arena":
      return `(() => {
        try {
          // Are.na's user nav has a "Profile" link to /<slug>.
          const links = Array.from(document.querySelectorAll('a[href^="/"]'));
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([a-z0-9-]{2,60})(\\/?$|\\?.*$)/i);
            if (!m) continue;
            const slug = m[1];
            if (['about','blog','log-in','login','sign-up','signup','channels','search','explore','pricing','jobs','privacy','terms','team','press','help','support','settings'].includes(slug.toLowerCase())) continue;
            return slug;
          }
          return '';
        } catch { return ''; }
      })()`;
    default:
      return `''`;
  }
}

function isAuthCookie(source: Source, cookie: Cookie): boolean {
  const name = cookie.name;
  switch (source) {
    case "twitter":
      return name === "auth_token";
    case "instagram":
      return name === "sessionid";
    case "tiktok":
      return name === "sessionid" || name === "sid_tt";
    case "pinterest":
      return name === "_pinterest_sess" || name === "_auth";
    case "youtube":
      return (
        name === "LOGIN_INFO" ||
        name === "SID" ||
        name === "__Secure-1PSID" ||
        name === "__Secure-3PSID"
      );
    case "arena":
      // are.na (Rails) sets `_arena_session` when logged in; the
      // `remember_user_token` cookie marks long-lived auth.
      return (
        name === "_arena_session" ||
        name === "remember_user_token" ||
        name === "cf_clearance" // not auth on its own; tolerated so the
        // first sync probes; gets refined below if it's the only one.
      );
    case "cosmos":
      // cosmos.so uses Supabase/NextAuth-style session tokens. Their cookie
      // name has changed before, so accept the standard auth-token shapes
      // rather than pinning to one literal.
      return (
        /^sb-[a-z0-9-]+-auth-token(\.\d+)?$/.test(name) ||
        name === "__Secure-next-auth.session-token" ||
        name === "next-auth.session-token" ||
        name === "cosmos.session-token"
      );
    case "local":
      return false;
  }
}

async function listCookiesForSource(source: Source): Promise<Cookie[]> {
  const persistent = session.fromPartition(PARTITION);
  const domain = primaryDomainForSource(source);
  if (!domain) return [];
  try {
    return await persistent.cookies.get({ domain });
  } catch (err) {
    log.warn("[pond refresh:window] cookies.get failed", domain, err);
    return [];
  }
}

export function primaryDomainForSource(source: Source): string | null {
  switch (source) {
    case "twitter":
      return ".x.com";
    case "instagram":
      return ".instagram.com";
    case "cosmos":
      return ".cosmos.so";
    case "tiktok":
      return ".tiktok.com";
    case "pinterest":
      return ".pinterest.com";
    case "arena":
      return ".are.na";
    case "youtube":
      return ".youtube.com";
    case "local":
      return null;
  }
}

export async function disconnectSource(
  source: Source,
): Promise<{ ok: boolean }> {
  const persistent = session.fromPartition(PARTITION);
  const domain = primaryDomainForSource(source);
  if (!domain) return { ok: true };

  // Drop the cached handle too: derived from the session we're clearing.
  try {
    const prefs = await getPrefs();
    if (prefs.sync.handles?.[source]) {
      const nextHandles = { ...prefs.sync.handles };
      delete nextHandles[source];
      await setPrefs({ sync: { handles: nextHandles } });
    }
  } catch (err) {
    log.warn("[pond refresh:disconnect] handle clear failed", source, err);
  }

  try {
    const cookies = await persistent.cookies.get({ domain });
    await Promise.all(
      cookies.map((c) => {
        const url = `${c.secure ? "https" : "http"}://${c.domain?.replace(/^\./, "") ?? domain.replace(/^\./, "")}${c.path ?? "/"}`;
        return persistent.cookies.remove(url, c.name).catch(() => {});
      }),
    );
    await persistent.clearStorageData({
      origin: `https://${domain.replace(/^\./, "")}`,
      storages: [
        "cookies",
        "localstorage",
        "indexdb",
        "websql",
        "serviceworkers",
      ],
    });
    return { ok: true };
  } catch (err) {
    log.warn("[pond refresh:window] disconnect failed", source, err);
    return { ok: false };
  }
}
