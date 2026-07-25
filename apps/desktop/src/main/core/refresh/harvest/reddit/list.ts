/// <reference lib="dom" />

import type { MediaType } from "@pond/schema/db";
import type { ListHarvestArgs, ListHarvestResult } from "../list-types";
import { inPageRedditNormalize } from "./normalize";

export function redditSavedUrl(handle: string): string {
  return `https://www.reddit.com/user/${encodeURIComponent(handle)}/saved/`;
}

export function buildRedditListExpression(args: ListHarvestArgs): string {
  const normSrc = `(${inPageRedditNormalize.toString()})()`;
  const fnSrc = `(${inPageRedditList.toString()})`;
  return `(async () => {
    const norm = ${normSrc};
    const args = ${JSON.stringify(args)};
    try { return await ${fnSrc}(args, norm); }
    catch (e) { return { ok: false, reason: 'timeout', error: String(e) }; }
  })()`;
}

async function inPageRedditList(
  args: ListHarvestArgs,
  norm: ReturnType<typeof inPageRedditNormalize>,
): Promise<ListHarvestResult> {
  if (
    location.pathname.startsWith("/login") ||
    location.pathname.includes("/register")
  ) {
    return { ok: false, reason: "auth_required" };
  }

  type Entry = {
    sourceId: string;
    url: string;
    savedAt?: string;
    title?: string;
    description?: string;
    author?: string;
    mediaUrl?: string;
    mediaUrls?: Array<{ url: string; type?: MediaType; poster?: string }>;
    mediaType?: MediaType;
  };

  const username =
    location.pathname.match(/^\/user\/([^/]+)\/saved/i)?.[1] ??
    location.pathname.match(/^\/u\/([^/]+)\/saved/i)?.[1];
  if (!username || username.toLowerCase() === "me") {
    return { ok: false, reason: "auth_required" };
  }

  const apiResult = await fetchSavedViaApi(username);
  if (apiResult) return apiResult;
  return await fallbackDomScroll();

  async function fetchSavedViaApi(
    handle: string,
  ): Promise<ListHarvestResult | null> {
    const entries: Entry[] = [];
    let after: string | undefined;
    const known = new Set(args.knownIds.map(String));
    const earlyStopEnabled = known.size > 0;
    let knownPageStreak = 0;
    const STOP_AFTER_KNOWN_PAGES = 2;

    function reportProgress(phase: string) {
      (globalThis as any).__pondHarvestStats = {
        phase,
        collected: entries.length,
        fresh: entries.filter((e) => !known.has(e.sourceId)).length,
      };
    }

    reportProgress("connecting");

    for (let page = 0; page < 200; page++) {
      const params = new URLSearchParams({
        limit: "100",
        raw_json: "1",
        type: "links",
      });
      if (after) params.set("after", after);
      const url = `/user/${encodeURIComponent(handle)}/saved.json?${params}`;

      let json: any;
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            accept: "application/json",
          },
        });

        if (res.status === 401 || res.status === 403) {
          return { ok: false, reason: "auth_required" };
        }
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const n = retryAfter ? Number(retryAfter) : Number.NaN;
          return {
            ok: false,
            reason: "rate_limited",
            ...(Number.isFinite(n) ? { retryAfterSec: Math.max(0, n) } : {}),
          };
        }
        if (!res.ok) return null;

        json = await res.json();
      } catch {
        return null;
      }

      if (json?.error === 403 || json?.reason === "private") {
        return { ok: false, reason: "auth_required" };
      }

      const children: any[] = json?.data?.children ?? [];
      if (children.length === 0 && page === 0) return null;

      let pageFresh = 0;
      for (const child of children) {
        if (child?.kind !== "t3") continue;
        const data = child.data ?? {};
        const id = typeof data.id === "string" ? data.id : null;
        if (!id) continue;
        const permalink =
          typeof data.permalink === "string"
            ? data.permalink
            : `/comments/${id}/`;
        const urlAbs = permalink.startsWith("http")
          ? permalink
          : `https://www.reddit.com${permalink}`;
        const thumb =
          typeof data.thumbnail === "string" &&
          data.thumbnail.startsWith("http")
            ? data.thumbnail
            : typeof data.preview?.images?.[0]?.source?.url === "string"
              ? String(data.preview.images[0].source.url).replace(/&amp;/g, "&")
              : undefined;
        const entry: Entry = {
          sourceId: id,
          url: urlAbs,
          ...(typeof data.title === "string" ? { title: data.title } : {}),
          ...(typeof data.selftext === "string" && data.selftext
            ? {
                description:
                  data.selftext.length > 4000
                    ? `${data.selftext.slice(0, 4000)}…`
                    : data.selftext,
              }
            : {}),
          ...(typeof data.author === "string" ? { author: data.author } : {}),
          ...(thumb
            ? {
                mediaUrl: thumb,
                mediaUrls: [{ url: thumb, type: "image" as MediaType }],
                mediaType: "image" as MediaType,
              }
            : {}),
          ...(typeof data.created_utc === "number"
            ? {
                savedAt: new Date(data.created_utc * 1000).toISOString(),
              }
            : {}),
        };
        if (!known.has(id)) pageFresh += 1;
        entries.push(entry);
      }

      reportProgress("fetching");

      if (earlyStopEnabled && children.length > 0 && pageFresh === 0) {
        knownPageStreak += 1;
        if (knownPageStreak >= STOP_AFTER_KNOWN_PAGES) {
          reportProgress("done");
          return { ok: true, entries, reachedEnd: true };
        }
      } else {
        knownPageStreak = 0;
      }

      const next = json?.data?.after;
      if (!next || typeof next !== "string") {
        reportProgress("done");
        return { ok: true, entries, reachedEnd: true };
      }
      after = next;
      await new Promise((r) => setTimeout(r, 500));
    }

    return { ok: true, entries, reachedEnd: false };
  }

  async function fallbackDomScroll(): Promise<ListHarvestResult> {
    const known = new Set(args.knownIds.map(String));
    type StubEntry = { sourceId: string; url: string };

    function collect(): StubEntry[] {
      const out: StubEntry[] = [];
      const seen = new Set<string>();
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/comments/"], shreddit-post a[slot="full-post-link"]',
        ),
      );
      for (const a of links) {
        const id = norm.extractPostId(a.href);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        let href = a.href;
        try {
          href = new URL(a.href, location.origin).href;
        } catch {}
        out.push({ sourceId: id, url: href });
      }
      for (const post of Array.from(
        document.querySelectorAll("shreddit-post"),
      )) {
        const id = post.getAttribute("id")?.replace(/^t3_/, "") ?? null;
        const permalink = post.getAttribute("permalink");
        if (!id || seen.has(id) || !permalink) continue;
        seen.add(id);
        out.push({
          sourceId: id,
          url: permalink.startsWith("http")
            ? permalink
            : `https://www.reddit.com${permalink}`,
        });
      }
      return out;
    }

    const hydrateDeadline = Date.now() + 12_000;
    while (Date.now() < hydrateDeadline) {
      if (
        document.querySelector("shreddit-post") ||
        document.querySelector('a[href*="/comments/"]')
      ) {
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    const collected = new Map<string, StubEntry>();
    function ingestRows(rows: StubEntry[]): void {
      for (const r of rows) {
        if (!collected.has(r.sourceId)) collected.set(r.sourceId, r);
      }
    }

    ingestRows(collect());
    const earlyStopEnabled = known.size > 0;
    let knownBatchStreak = 0;
    let stable = 0;
    const deadline = Date.now() + 60_000;

    while (Date.now() < deadline && stable < 4) {
      const before = collected.size;
      window.scrollBy(0, Math.max(600, window.innerHeight * 0.9));
      await new Promise((r) => setTimeout(r, 700));
      const batch = collect();
      let pageFresh = 0;
      for (const row of batch) {
        if (!collected.has(row.sourceId)) {
          collected.set(row.sourceId, row);
          if (!known.has(row.sourceId)) pageFresh += 1;
        } else if (!known.has(row.sourceId)) {
          pageFresh += 1;
        }
      }
      (globalThis as any).__pondHarvestStats = {
        phase: "scrolling",
        collected: collected.size,
        fresh: [...collected.keys()].filter((id) => !known.has(id)).length,
      };
      if (collected.size === before) stable += 1;
      else stable = 0;
      if (earlyStopEnabled && batch.length > 0 && pageFresh === 0) {
        knownBatchStreak += 1;
        if (knownBatchStreak >= 3) break;
      } else {
        knownBatchStreak = 0;
      }
    }

    return {
      ok: true,
      entries: Array.from(collected.values()),
      reachedEnd: true,
    };
  }
}
