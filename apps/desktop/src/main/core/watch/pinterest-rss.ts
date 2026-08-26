import type { WatchKind } from "@pond/schema/db";
import log from "electron-log/main.js";
import { sourceIdFromUrl } from "../pipeline/url";
import type { WatchEntry, WatchHarvestResult } from "./types";

const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15 PondBot/0.1";

function feedUrl(handle: string, kind?: WatchKind): string | null {
  if (kind === "board" || handle.includes("/")) {
    const [user, board] = handle.split("/", 2);
    if (!user || !board) return null;
    return `https://www.pinterest.com/${encodeURIComponent(user)}/${encodeURIComponent(board)}.rss`;
  }
  return `https://www.pinterest.com/${encodeURIComponent(handle)}/feed.rss`;
}

function entriesFromRss(xml: string): WatchEntry[] {
  const entries: WatchEntry[] = [];
  const seen = new Set<string>();
  for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const link =
      /<link>\s*([^<\s]+)\s*<\/link>/.exec(item)?.[1] ??
      /<guid[^>]*>\s*([^<\s]+)\s*<\/guid>/.exec(item)?.[1];
    if (!link || !/\/pin\/\d+\/?(?:[?#]|$)/.test(link)) continue;
    const sourceId = sourceIdFromUrl("pinterest", link);
    if (!sourceId || seen.has(sourceId)) continue;
    seen.add(sourceId);
    entries.push({ url: link, sourceId });
  }
  return entries;
}

export async function listPinterestWatch(
  handle: string,
  kind?: WatchKind,
): Promise<WatchHarvestResult> {
  const url = feedUrl(handle, kind);
  if (!url) return { ok: false, reason: "unknown" };
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "omit",
      headers: {
        accept: "application/rss+xml, text/xml",
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    log.warn("[pond watch:pinterest] fetch failed", url, err);
    return { ok: false, reason: "unavailable" };
  }
  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (res.status === 429) return { ok: false, reason: "rate_limited" };
  if (!res.ok) return { ok: false, reason: "unavailable" };
  const body = await res.text();
  if (!/<rss[\s>]/i.test(body)) return { ok: false, reason: "not_found" };
  return { ok: true, entries: entriesFromRss(body) };
}
