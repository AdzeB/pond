/// <reference lib="dom" />

import type { MediaType } from "@pond/schema/db";
import type { ListHarvestArgs, ListHarvestResult } from "../list-types";
import { inPageInstagramNormalize } from "./normalize";

export function buildInstagramListExpression(args: ListHarvestArgs): string {
  const normSrc = `(${inPageInstagramNormalize.toString()})()`;
  const fnSrc = `(${inPageInstagramList.toString()})`;
  return `(async () => {
    const norm = ${normSrc};
    const args = ${JSON.stringify(args)};
    try { return await ${fnSrc}(args, norm); }
    catch (e) { return { ok: false, reason: 'timeout', error: String(e) }; }
  })()`;
}

async function inPageInstagramList(
  args: ListHarvestArgs,
  norm: ReturnType<typeof inPageInstagramNormalize>,
): Promise<ListHarvestResult> {
  if (
    location.pathname.startsWith("/accounts/login") ||
    location.pathname.startsWith("/login")
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
    meta?: Record<string, unknown>;
  };

  const apiResult = await fetchSavedViaApi();
  if (apiResult) return apiResult;
  return await fallbackDomScroll();

  async function fetchSavedViaApi(): Promise<ListHarvestResult | null> {
    const entries: Entry[] = [];
    let cursor: string | undefined;
    const known = new Set(args.knownIds.map(String));
    const earlyStopEnabled = args.earlyStop ?? known.size > 0;
    let knownPageStreak = 0;
    const STOP_AFTER_KNOWN_PAGES = 2;
    let freshCount = 0;

    function checkpoint(): void {
      (globalThis as any).__pondHarvestPartial = entries.map((e) => ({
        sourceId: e.sourceId,
        url: e.url,
        savedAt: e.savedAt,
      }));
    }

    function reportProgress(
      phase: string,
      extra: Record<string, unknown> = {},
    ) {
      (globalThis as any).__pondHarvestStats = {
        phase,
        collected: entries.length,
        fresh: freshCount,
        path: location.pathname,
        earlyStop: earlyStopEnabled,
        known: known.size,
        ...extra,
      };
    }

    reportProgress("connecting", {});

    for (let page = 0; page < 200; page++) {
      if ((globalThis as any).__pondHarvestAbort) {
        reportProgress("aborted", { page });
        checkpoint();
        return { ok: true, entries, reachedEnd: false };
      }

      const url = cursor
        ? `/api/v1/feed/saved/posts/?max_id=${cursor}`
        : "/api/v1/feed/saved/posts/";

      reportProgress("api_fetch", { page, cursor: cursor ?? null });

      let json: any;
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            "x-ig-app-id": "936619743392459",
            "x-asbd-id": "129477",
            "x-requested-with": "XMLHttpRequest",
            accept: "*/*",
          },
        });

        reportProgress("api_response", { page, status: res.status });

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
        if (!res.ok) {
          reportProgress("api_not_ok", { page, status: res.status });
          return null;
        }

        json = await res.json();
      } catch (err) {
        reportProgress("api_error", {
          page,
          error: err instanceof Error ? err.name : "error",
        });
        return null;
      }

      if (json?.require_login || json?.message === "login_required") {
        return { ok: false, reason: "auth_required" };
      }

      const items: any[] = json?.items ?? [];
      if (items.length === 0 && page === 0) {
        reportProgress("api_empty", { page });
        return null;
      }

      let pageFresh = 0;
      let pageNorm = 0;
      for (const item of items) {
        const raw = norm.normalizeMediaNode(item?.media, {
          savedTimestamp: item?.timestamp,
        });
        if (!raw) continue;
        pageNorm += 1;
        if (!known.has(String((raw as Entry).sourceId))) {
          pageFresh += 1;
          freshCount += 1;
        }
        entries.push(raw as Entry);
      }

      checkpoint();
      reportProgress("fetching", {
        page,
        items: items.length,
        pageNorm,
        pageFresh,
        more: json?.more_available === true,
      });

      if (earlyStopEnabled && items.length > 0 && pageFresh === 0) {
        knownPageStreak += 1;
        if (knownPageStreak >= STOP_AFTER_KNOWN_PAGES) {
          reportProgress("done", { page, earlyStop: true });
          return { ok: true, entries, reachedEnd: true };
        }
      } else {
        knownPageStreak = 0;
      }

      const moreAvailable = json?.more_available === true;
      const nextCursor = json?.next_max_id;

      if (!moreAvailable || !nextCursor) {
        reportProgress("done", { page, earlyStop: false });
        return { ok: true, entries, reachedEnd: true };
      }

      cursor = String(nextCursor);
      await new Promise((r) => setTimeout(r, 250));
    }

    reportProgress("done", { page: 199, capped: true });
    checkpoint();
    return { ok: true, entries, reachedEnd: false };
  }

  async function fallbackDomScroll(): Promise<ListHarvestResult> {
    (globalThis as any).__pondHarvestStats = {
      phase: "dom_fallback",
      collected: 0,
      fresh: 0,
      path: location.pathname,
    };
    const _known = new Set(args.knownIds.map(String));

    type StubEntry = { sourceId: string; url: string };

    function collect(): StubEntry[] {
      const out: StubEntry[] = [];
      const seen = new Set<string>();
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]',
        ),
      );
      for (const a of links) {
        let id: string | null = null;
        let kind = "p";
        try {
          const u = new URL(a.href, location.origin);
          const m = u.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
          if (m?.[1] && m[2]) {
            kind = m[1];
            id = m[2];
          }
        } catch {}
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push({
          sourceId: id,
          url: `https://www.instagram.com/${kind}/${id}/`,
        });
      }
      return out;
    }

    const hydrateDeadline = Date.now() + 12_000;
    while (Date.now() < hydrateDeadline) {
      if (
        document.querySelector('a[href*="/p/"], a[href*="/reel/"]') ||
        document.querySelector("article")
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

    const scrollDeadline = Date.now() + 60_000;
    let lastHeight = document.documentElement.scrollHeight;
    let stable = 0;
    while (Date.now() < scrollDeadline) {
      window.scrollBy({
        top: window.innerHeight * 0.9,
        behavior: "instant" as ScrollBehavior,
      });
      await new Promise((r) => setTimeout(r, 700));
      ingestRows(collect());
      const sh = document.documentElement.scrollHeight;
      if (sh === lastHeight) {
        stable += 1;
        if (stable >= 4) {
          return {
            ok: true,
            entries: Array.from(collected.values()),
            reachedEnd: true,
          };
        }
      } else {
        stable = 0;
        lastHeight = sh;
      }
    }
    return {
      ok: true,
      entries: Array.from(collected.values()),
      reachedEnd: false,
    };
  }
}
