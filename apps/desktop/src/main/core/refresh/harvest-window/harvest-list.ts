import { MEDIA_TYPES, type Source } from "@pond/schema/db";
import log from "electron-log/main.js";
import { z } from "zod";
import { markAtRisk, report } from "../../pipeline/rate-governor";
import { arenaProfileUrl, buildArenaListExpression } from "../harvest/arena";
import { buildCosmosListExpression, COSMOS_LIST_URL } from "../harvest/cosmos";
import {
  buildInstagramLikesExpression,
  buildInstagramListExpression,
  INSTAGRAM_LIKES_TIMEOUT_MS,
  INSTAGRAM_LIKES_URL,
} from "../harvest/instagram";
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

const OptionalText = z.string().optional().catch(undefined);
const OptionalCount = z.number().optional().catch(undefined);
const StatsTextSchema = z.string().catch("");

const HarvestStatsSchema = z
  .object({
    phase: OptionalText,
    collected: OptionalCount,
    fresh: OptionalCount,
  })
  .nullable()
  .catch(null);

type ListHarvestProgress = NonNullable<z.infer<typeof HarvestStatsSchema>>;

const PartialEntrySchema = z
  .object({ sourceId: z.string(), url: z.string(), savedAt: OptionalText })
  .nullable()
  .catch(null);

const ListEntrySchema = z
  .object({
    sourceId: z.string(),
    url: z.string(),
    savedAt: OptionalText,
    title: OptionalText,
    description: OptionalText,
    author: OptionalText,
    mediaUrl: OptionalText,
    mediaUrls: z
      .array(
        z.object({
          url: z.string(),
          type: z.enum(MEDIA_TYPES).optional().catch(undefined),
          poster: OptionalText,
        }),
      )
      .optional()
      .catch(undefined),
    mediaType: z.enum(MEDIA_TYPES).optional().catch(undefined),
  })
  .nullable()
  .catch(null);

const ListResultSchema = z
  .union([
    z.object({
      ok: z.literal(true),
      entries: z.array(ListEntrySchema).catch([]),
      reachedEnd: z.boolean().catch(false),
      seen: OptionalCount,
    }),
    z.object({
      ok: z.literal(false),
      reason: z
        .enum([
          "auth_required",
          "no_match",
          "timeout",
          "unknown",
          "rate_limited",
        ])
        .catch("unknown"),
      retryAfterSec: OptionalCount,
    }),
  ])
  .nullable()
  .catch(null);

function readStats(raw: string): ListHarvestProgress | null {
  try {
    return HarvestStatsSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function harvestSourceList(
  source: Source,
  args: SourceListArgs,
  opts: {
    onProgress?: (p: ListHarvestProgress) => void;
    partition?: string;
  } = {},
): Promise<ListHarvestResult> {
  if (source === "reddit") {
    const { harvestRedditLists } = await import("../harvest/reddit/api");
    return harvestRedditLists(args, opts.partition);
  }
  if (source === "cosmos") {
    const { harvestCosmosLibrary } = await import("../harvest/cosmos/api");
    return harvestCosmosLibrary(args, opts.partition);
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
    let lastStats: ListHarvestProgress | null = null;
    {
      let lastCollected = -1;
      pollInterval = setInterval(() => {
        if (stopPolling) return;
        if (lease.win.isDestroyed()) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }
        void lease.win.webContents
          .executeJavaScript(
            "JSON.stringify(globalThis.__pondHarvestStats ?? null)",
            true,
          )
          .then((raw) => {
            const stats = readStats(StatsTextSchema.parse(raw));
            if (!stats) return;
            lastStats = stats;
            if (
              opts.onProgress &&
              stats.collected !== undefined &&
              stats.collected !== lastCollected
            ) {
              lastCollected = stats.collected;
              opts.onProgress(stats);
            }
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

    const parsed = ListResultSchema.parse(raw);
    if (!parsed) {
      return { ok: false, reason: "no_match" };
    }
    if (!parsed.ok) {
      if (parsed.reason === "rate_limited") {
        const { cooldownMs } = report(source, {
          ok: false,
          rateLimited: true,
          retryAfterSec: parsed.retryAfterSec,
        });
        log.warn(
          `[pond list:${source}] rate limited; backing off ${Math.round(cooldownMs / 1000)}s`,
        );
      }
      return parsed;
    }
    const result: Extract<ListHarvestResult, { ok: true }> = {
      ok: true,
      entries: parsed.entries.flatMap((e) => (e ? [e] : [])),
      reachedEnd: parsed.reachedEnd,
    };
    if (parsed.seen != null) {
      result.seen = parsed.seen;
    } else {
      const collected = await readHarvestCollected(lease.win);
      if (collected != null) result.seen = collected;
    }
    report(source, { ok: true });
    return result;
  } catch (err) {
    log.warn("[pond list]", source, "unexpected error", err);
    return { ok: false, reason: "unknown" };
  } finally {
    lease.release();
  }
}

async function readHarvestCollected(
  win: Electron.BrowserWindow,
): Promise<number | null> {
  try {
    const raw = await win.webContents.executeJavaScript(
      "JSON.stringify(globalThis.__pondHarvestStats ?? null)",
      true,
    );
    return readStats(StatsTextSchema.parse(raw))?.collected ?? null;
  } catch {
    return null;
  }
}

async function readHarvestPartial(
  win: Electron.BrowserWindow,
): Promise<Array<NonNullable<z.infer<typeof PartialEntrySchema>>> | null> {
  try {
    const raw = await win.webContents.executeJavaScript(
      "JSON.stringify(globalThis.__pondHarvestPartial ?? null)",
      true,
    );
    const rows = z
      .array(PartialEntrySchema)
      .catch([])
      .parse(JSON.parse(StatsTextSchema.parse(raw)));
    const entries = rows.flatMap((row) => (row ? [row] : []));
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
      return COSMOS_LIST_URL;
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

export async function harvestInstagramLikedList(
  args: ListHarvestArgs,
  opts: { partition?: string } = {},
): Promise<ListHarvestResult> {
  const lease = await leaseWindow("instagram", { partition: opts.partition });
  try {
    const navOk = await navigateWithTimeout(
      lease.win,
      INSTAGRAM_LIKES_URL,
      NAV_TIMEOUT_MS,
    );
    if (!navOk) return { ok: false, reason: "timeout" };
    const landedUrl = lease.win.webContents.getURL();
    const challenge = looksLikeChallenge(landedUrl);
    if (challenge) {
      markAtRisk(
        "instagram",
        challenge.kind,
        `likes harvest landed on ${challenge.kind}`,
      );
      return { ok: false, reason: "auth_required" };
    }
    if (looksLikeAuthWall(landedUrl))
      return { ok: false, reason: "auth_required" };

    await lease.win.webContents
      .executeJavaScript(
        "globalThis.__pondHarvestAbort = false; globalThis.__pondHarvestPartial = null;",
        true,
      )
      .catch(() => {});
    const raw = await Promise.race([
      lease.win.webContents.executeJavaScript(
        buildInstagramLikesExpression(args),
        true,
      ),
      sleep(INSTAGRAM_LIKES_TIMEOUT_MS).then(() => "__pond_ig_likes_timeout__"),
    ]);
    if (raw === "__pond_ig_likes_timeout__") {
      await lease.win.webContents
        .executeJavaScript("globalThis.__pondHarvestAbort = true;", true)
        .catch(() => {});
      await sleep(750);
      const partial = await readHarvestPartial(lease.win);
      if (partial && partial.length > 0) {
        log.info(
          `[pond list] instagram likes recovered ${partial.length} entries after timeout`,
        );
        return { ok: true, entries: partial, reachedEnd: false };
      }
      return { ok: false, reason: "timeout" };
    }
    const parsed = ListResultSchema.parse(raw);
    if (!parsed) return { ok: false, reason: "no_match" };
    if (!parsed.ok) {
      log.warn(`[pond list] instagram likes stopped: ${parsed.reason}`);
      return parsed;
    }
    report("instagram", { ok: true });
    log.info(
      `[pond list] instagram likes read ${parsed.entries.length} (reachedEnd=${parsed.reachedEnd})`,
    );
    return {
      ok: true,
      entries: parsed.entries.flatMap((e) => (e ? [e] : [])),
      reachedEnd: parsed.reachedEnd,
      seen: parsed.seen ?? parsed.entries.length,
    };
  } catch (err) {
    log.warn("[pond list] instagram likes unexpected error", err);
    return { ok: false, reason: "unknown" };
  } finally {
    lease.release();
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
    const parsed = ListResultSchema.parse(raw);
    if (!parsed) return { ok: false, reason: "no_match" };
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      entries: parsed.entries.flatMap((e) => (e ? [e] : [])),
      reachedEnd: parsed.reachedEnd,
    };
  } catch (err) {
    log.warn("[pond list] youtube LL unexpected error", err);
    return { ok: false, reason: "timeout" };
  } finally {
    lease.release();
  }
}
