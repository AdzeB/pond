import type { Capture, CaptureMedia } from "@pond/schema/raw";
import { session } from "electron";
import log from "electron-log/main.js";
import { partitionForIngest } from "../../../sync/accounts";
import { PARTITION } from "../../scrape-window/constants";
import type { ListHarvestArgs, ListHarvestResult } from "../list-types";
import {
  avatarFromMeJson,
  entriesFromListing,
  handleFromMeJson,
} from "./listing";

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

type JsonResult =
  | { ok: true; json: unknown }
  | { ok: false; status: number; html: boolean };

async function fetchRedditJson(
  partition: string,
  url: string,
): Promise<JsonResult> {
  const ses = session.fromPartition(partition);
  ses.setUserAgent(CHROME_UA);
  let res: Response;
  try {
    res = await ses.fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": CHROME_UA,
      },
    });
  } catch (err) {
    log.warn("[pond reddit-api] fetch threw", url, err);
    return { ok: false, status: 0, html: false };
  }
  const text = await res.text();
  const ct = res.headers.get("content-type") ?? "";
  const html = ct.includes("text/html") || text.trimStart().startsWith("<");
  if (!res.ok || html) {
    return { ok: false, status: res.status, html };
  }
  try {
    return { ok: true, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: res.status, html: false };
  }
}

export async function probeRedditHandle(
  partition: string = PARTITION,
): Promise<string | null> {
  for (const url of [
    "https://www.reddit.com/api/me.json?raw_json=1",
    "https://old.reddit.com/api/me.json?raw_json=1",
  ]) {
    const result = await fetchRedditJson(partition, url);
    if (!result.ok) continue;
    const handle = handleFromMeJson(result.json);
    if (handle) {
      log.info("[pond reddit-api] probed handle", handle);
      return handle;
    }
  }
  return null;
}

export async function fetchRedditAvatar(
  name: string,
  partition: string,
): Promise<string | null> {
  const me = await fetchRedditJson(
    partition,
    "https://www.reddit.com/api/me.json?raw_json=1",
  );
  if (me.ok) {
    const url = avatarFromMeJson(me.json);
    if (url) return url;
  }
  const about = await fetchRedditJson(
    partition,
    `https://www.reddit.com/user/${encodeURIComponent(name)}/about.json?raw_json=1`,
  );
  if (!about.ok) return null;
  return avatarFromMeJson(about.json);
}

export async function harvestRedditSavedJson(
  args: ListHarvestArgs & { accountKey?: string },
  partition?: string,
): Promise<ListHarvestResult> {
  const jar = partition ?? (await partitionForIngest("reddit"));
  const handle = args.accountKey?.replace(/^u\//, "").trim() || "me";
  const known = new Set(args.knownIds.map(String));
  const earlyStopEnabled = args.earlyStop !== false && known.size > 0;
  const entries = [];
  let after: string | null = null;
  let knownPageStreak = 0;

  for (let page = 0; page < 200; page++) {
    const params = new URLSearchParams({
      limit: "100",
      raw_json: "1",
      type: "links",
    });
    if (after) params.set("after", after);
    const url = `https://www.reddit.com/user/${encodeURIComponent(handle)}/saved.json?${params}`;
    const result = await fetchRedditJson(jar, url);
    if (!result.ok) {
      if (result.status === 401 || result.status === 403 || result.html) {
        return { ok: false, reason: "auth_required" };
      }
      if (result.status === 429) {
        return { ok: false, reason: "rate_limited" };
      }
      if (page === 0) return { ok: false, reason: "no_match" };
      break;
    }
    const pageData = entriesFromListing(result.json);
    if (page === 0 && pageData.entries.length === 0 && !pageData.after) {
      return { ok: true, entries: [], reachedEnd: true, seen: 0 };
    }
    let pageFresh = 0;
    for (const entry of pageData.entries) {
      if (!known.has(entry.sourceId)) pageFresh += 1;
      entries.push(entry);
    }
    if (earlyStopEnabled && pageData.entries.length > 0 && pageFresh === 0) {
      knownPageStreak += 1;
      if (knownPageStreak >= 2) {
        return { ok: true, entries, reachedEnd: true, seen: entries.length };
      }
    } else {
      knownPageStreak = 0;
    }
    if (!pageData.after) {
      log.info(
        `[pond reddit-api] saved json handle=${handle} entries=${entries.length}`,
      );
      return { ok: true, entries, reachedEnd: true, seen: entries.length };
    }
    after = pageData.after;
    await sleep(400);
  }
  log.info(
    `[pond reddit-api] saved json handle=${handle} entries=${entries.length} pages=200`,
  );
  return { ok: true, entries, reachedEnd: false, seen: entries.length };
}

export async function fetchRedditPostCapture(
  postId: string,
  partition?: string,
): Promise<Capture | null> {
  const jar = partition ?? (await partitionForIngest("reddit"));
  const url = `https://www.reddit.com/comments/${encodeURIComponent(postId)}.json?raw_json=1`;
  const result = await fetchRedditJson(jar, url);
  if (!result.ok) return null;
  const listing = Array.isArray(result.json) ? result.json[0] : result.json;
  const { entries } = entriesFromListing(listing);
  const entry = entries[0];
  if (!entry) return null;
  const media: CaptureMedia[] = (entry.mediaUrls ?? []).map((m) => ({
    url: m.url,
    type: m.type === "video" ? "video" : "image",
    ...(m.poster ? { posterUrl: m.poster } : {}),
  }));
  const metrics = {
    ...(entry.likes !== undefined ? { likes: entry.likes } : {}),
    ...(entry.comments !== undefined ? { comments: entry.comments } : {}),
  };
  const extras = {
    ...(entry.subreddit ? { subreddit: entry.subreddit } : {}),
  };
  return {
    id: postId,
    source: "reddit",
    url: entry.url,
    title: entry.title,
    description: entry.description,
    ...(entry.author
      ? {
          author: {
            handle: entry.author,
            profileUrl: `https://www.reddit.com/user/${entry.author}/`,
          },
        }
      : {}),
    ...(entry.publishedAt ? { publishedAt: entry.publishedAt } : {}),
    media,
    ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
    ...(Object.keys(extras).length > 0 ? { extras } : {}),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
