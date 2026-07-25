/// <reference lib="dom" />

import type { MediaType } from "@pond/schema/db";
import { buildScrollListExpression } from "../lib/expression";
import type { inPageScrollCollect } from "../lib/scroll";
import type { ListHarvestArgs, ListHarvestResult } from "../list-types";
import { inPageThreadsNormalize } from "./normalize";

export const THREADS_LIST_URL = "https://www.threads.com/saved";

export function buildThreadsListExpression(args: ListHarvestArgs): string {
  return buildScrollListExpression(
    inPageThreadsNormalize,
    inPageThreadsList,
    args,
  );
}

async function inPageThreadsList(
  args: ListHarvestArgs,
  scroll: ReturnType<typeof inPageScrollCollect>,
  norm: ReturnType<typeof inPageThreadsNormalize>,
): Promise<ListHarvestResult> {
  if (
    location.pathname.startsWith("/login") ||
    location.pathname.includes("/accounts/login")
  ) {
    return { ok: false, reason: "auth_required" };
  }

  function collectFn() {
    const out: Array<{
      sourceId: string;
      url: string;
      title?: string;
      author?: string;
      mediaUrl?: string;
      mediaType?: MediaType;
    }> = [];
    const seen = new Set<string>();
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="/post/"], a[href*="/t/"]',
      ),
    );
    for (const a of links) {
      const id = norm.extractPostCode(a.href);
      if (!id || seen.has(id)) continue;
      seen.add(id);

      let pathname = "";
      let href = a.href;
      try {
        const u = new URL(a.href, location.origin);
        pathname = u.pathname;
        href = u.href;
      } catch {}

      const card =
        a.closest("article, [role='article'], [data-pressable-container]") ??
        a.parentElement;
      const img = (card ?? a).querySelector<HTMLImageElement>("img");
      const src = img?.src ?? img?.currentSrc ?? undefined;
      const mediaUrl = src && !src.startsWith("data:") ? src : undefined;
      const handle = pathname.match(/\/@([^/]+)\//)?.[1];
      const text = card
        ?.querySelector<HTMLElement>("span[dir='auto'], div[dir='auto']")
        ?.textContent?.trim();

      const cleanUrl = href.includes("/post/")
        ? (href.split("?")[0] ?? href)
        : `https://www.threads.com/t/${id}`;
      out.push({
        sourceId: id,
        url: cleanUrl,
        ...(text
          ? {
              title: text.length <= 90 ? text : `${text.slice(0, 89)}…`,
            }
          : {}),
        ...(handle ? { author: handle } : {}),
        ...(mediaUrl ? { mediaUrl, mediaType: "image" as MediaType } : {}),
      });
    }
    return out;
  }

  return scroll({
    collectFn,
    knownIds: args.knownIds,
    hydrateSelector: 'a[href*="/post/"], a[href*="/t/"]',
  });
}
