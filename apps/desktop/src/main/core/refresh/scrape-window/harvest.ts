import type { Source } from "@pond/schema/db";
import log from "electron-log/main.js";
import { partitionForIngest } from "../../sync/accounts";
import { harvesterFor } from "../harvest";
import type { ScrapedHarvest } from "../harvest/types";
import { HARVEST_TIMEOUT_MS, NAV_TIMEOUT_MS } from "./constants";
import { looksLikeAuthWall, navigateWithTimeout } from "./navigation";
import { leaseWindow } from "./pool";
import { sleep } from "./util";

export { harvestTwitterBookmarks } from "./harvest-bookmarks";
export { harvestSourceList, harvestYoutubeLikedList } from "./harvest-list";
export { harvestThreadsSaved } from "./harvest-saved";

interface HarvestArgs {
  url: string;
  source: Source;
  sourceId?: string;
  /** Connected account whose session should load the page, when known. */
  accountId?: string | null;
}

interface HarvestResult {
  ok: boolean;
  harvest?: ScrapedHarvest;
  sourceId?: string;
  reason?: "navigate_failed" | "harvest_failed" | "auth_required" | "timeout";
}

export async function harvestUrl(args: HarvestArgs): Promise<HarvestResult> {
  const partition = await partitionForIngest(args.source, args.accountId);
  const harv = harvesterFor(args.source);
  const sourceId = args.sourceId ?? harv.sourceIdFromUrl(args.url) ?? "";

  if (args.source === "reddit" && sourceId) {
    const { fetchRedditPostCapture } = await import("../harvest/reddit/api");
    const capture = await fetchRedditPostCapture(sourceId, partition);
    if (capture) {
      return {
        ok: true,
        sourceId,
        harvest: {
          title: capture.title,
          description: capture.description,
          author: capture.author?.handle,
          mediaUrl: capture.media[0]?.url,
          mediaUrls: capture.media.map((m) => ({
            url: m.url,
            type: m.type,
            ...(m.posterUrl ? { poster: m.posterUrl } : {}),
          })),
          mediaType: capture.media[0]?.type,
        },
      };
    }
  }

  const lease = await leaseWindow(args.source, { partition });

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
