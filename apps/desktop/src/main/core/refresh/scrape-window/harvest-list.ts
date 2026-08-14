import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Source } from "@pond/schema/db";
import { app, type BrowserWindow } from "electron";
import log from "electron-log/main.js";
import { markAtRisk, report } from "../../pipeline/rate-governor";
import { arenaProfileUrl, buildArenaListExpression } from "../harvest/arena";
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
import { buildRedditListExpression, redditSavedUrl } from "../harvest/reddit";
import {
  buildThreadsListExpression,
  THREADS_LIST_URL,
} from "../harvest/threads";
import {
  buildTiktokListExpression,
  tiktokFavouritesUrl,
} from "../harvest/tiktok";
import {
  buildYoutubeListExpression,
  YOUTUBE_LIST_URLS,
} from "../harvest/youtube";
import { NAV_TIMEOUT_MS } from "./constants";
import {
  looksLikeAuthWall,
  looksLikeChallenge,
  navigateWithTimeout,
} from "./navigation";
import { leaseWindow } from "./pool";
import { sleep } from "./util";

interface SourceListArgs extends ListHarvestArgs {
  accountKey?: string;
}

interface ListHarvestProgress {
  phase: string;
  collected: number;
  fresh: number;
}

export async function harvestSourceList(
  source: Source,
  args: SourceListArgs,
  opts: {
    onProgress?: (p: ListHarvestProgress) => void;
    /** Session partition of the account being synced. */
    partition?: string;
  } = {},
): Promise<ListHarvestResult> {
  if (source === "reddit") {
    const { harvestRedditSavedJson } = await import("../harvest/reddit/api");
    return harvestRedditSavedJson(args, opts.partition);
  }
  const target = listUrlForSource(source, args.accountKey);
  if (!target) {
    return { ok: false, reason: "no_match" };
  }
  const lease = await leaseWindow(source, { partition: opts.partition });
  try {
    const navOk = await navigateWithTimeout(lease.win, target, NAV_TIMEOUT_MS);
    if (!navOk) {
      return { ok: false, reason: "timeout" };
    }
    const landedUrl = lease.win.webContents.getURL();
    const challenge = looksLikeChallenge(landedUrl);
    if (challenge) {
      /** Anti-abuse interstitial: hard-stop and park the source so we never keep poking an account the platform is already scrutinising. */
      markAtRisk(source, challenge.kind, `harvest landed on ${challenge.kind}`);
      return { ok: false, reason: "auth_required" };
    }
    if (looksLikeAuthWall(landedUrl)) {
      return { ok: false, reason: "auth_required" };
    }
    const expr = buildListExpressionFor(source, args);
    if (!expr) {
      return { ok: false, reason: "no_match" };
    }

    let stopPolling = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let lastStats: Record<string, unknown> | null = null;
    {
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
              const stats = JSON.parse(raw) as ListHarvestProgress &
                Record<string, unknown>;
              lastStats = stats;
              if (
                opts.onProgress &&
                typeof stats.collected === "number" &&
                stats.collected !== lastCollected
              ) {
                lastCollected = stats.collected;
                opts.onProgress?.(stats);
              }
            } catch {}
          })
          .catch(() => {});
      }, 1500);
    }

    const timeoutMs = source === "instagram" ? 300_000 : 90_000;
    await lease.win.webContents
      .executeJavaScript(
        "globalThis.__pondHarvestAbort = false; globalThis.__pondHarvestPartial = null;",
        true,
      )
      .catch(() => {});
    const raw = await Promise.race([
      lease.win.webContents.executeJavaScript(expr, true),
      sleep(timeoutMs).then(() => "__pond_list_timeout__"),
    ]).finally(() => {
      stopPolling = true;
      if (pollInterval) clearInterval(pollInterval);
    });

    if (raw === "__pond_list_timeout__") {
      log.warn("[pond list]", source, "harvest timed out", lastStats);
      await lease.win.webContents
        .executeJavaScript("globalThis.__pondHarvestAbort = true;", true)
        .catch(() => {});
      await sleep(750);
      const partial = await readHarvestPartial(lease.win);
      if (partial && partial.length > 0) {
        log.info(
          `[pond list] ${source} recovered ${partial.length} entries after timeout`,
        );
        return { ok: true, entries: partial, reachedEnd: false };
      }
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
    const result = raw as ListHarvestResult;
    /** Harvesters that return only fresh entries undercount what they scanned; backfill from __pondHarvestStats.collected. */
    if (result.ok && result.seen == null) {
      const collected = await readHarvestCollected(lease.win);
      if (collected != null) result.seen = collected;
    }
    /** Feed the outcome to the governor so cooldowns and pacing adapt for every source's list harvest. */
    if (!result.ok && result.reason === "rate_limited") {
      const { cooldownMs } = report(source, {
        ok: false,
        rateLimited: true,
        retryAfterSec: result.retryAfterSec,
      });
      log.warn(
        `[pond list:${source}] rate limited; backing off ${Math.round(cooldownMs / 1000)}s`,
      );
    } else if (result.ok) {
      report(source, { ok: true });
    }
    return result;
  } catch (err) {
    log.warn("[pond list]", source, "unexpected error", err);
    return { ok: false, reason: "unknown" };
  } finally {
    lease.release();
  }
}

/** Reads the scanned count from `__pondHarvestStats.collected`; null when the harvester doesn't track it. */
async function readHarvestCollected(
  win: Electron.BrowserWindow,
): Promise<number | null> {
  try {
    const raw = await win.webContents.executeJavaScript(
      "JSON.stringify(globalThis.__pondHarvestStats ?? null)",
      true,
    );
    if (typeof raw !== "string" || raw === "null") return null;
    const stats = JSON.parse(raw) as { collected?: number };
    return typeof stats.collected === "number" ? stats.collected : null;
  } catch {
    return null;
  }
}

/** Entries checkpointed by long list harvesters so a wall-clock timeout can still enqueue progress. */
async function readHarvestPartial(
  win: Electron.BrowserWindow,
): Promise<Array<{ sourceId: string; url: string; savedAt?: string }> | null> {
  try {
    const raw = await win.webContents.executeJavaScript(
      "JSON.stringify(globalThis.__pondHarvestPartial ?? null)",
      true,
    );
    if (typeof raw !== "string" || raw === "null") return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const entries: Array<{ sourceId: string; url: string; savedAt?: string }> =
      [];
    for (const row of parsed) {
      if (
        row &&
        typeof row === "object" &&
        typeof (row as { sourceId?: unknown }).sourceId === "string" &&
        typeof (row as { url?: unknown }).url === "string"
      ) {
        const savedAt = (row as { savedAt?: unknown }).savedAt;
        entries.push({
          sourceId: (row as { sourceId: string }).sourceId,
          url: (row as { url: string }).url,
          ...(typeof savedAt === "string" ? { savedAt } : {}),
        });
      }
    }
    return entries.length > 0 ? entries : null;
  } catch {
    return null;
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
    case "reddit":
      return accountKey ? redditSavedUrl(accountKey) : null;
    case "threads":
      return THREADS_LIST_URL;
    case "web":
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
    case "reddit":
      return buildRedditListExpression(args);
    case "threads":
      return buildThreadsListExpression(args);
    case "web":
      return null;
    case "local":
      return null;
  }
}

export async function harvestYoutubeLikedList(
  args: ListHarvestArgs,
  opts: { partition?: string } = {},
): Promise<ListHarvestResult> {
  const lease = await leaseWindow("youtube", { partition: opts.partition });
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
