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
      mediaUrls?: Array<{ url: string; type?: MediaType; poster?: string }>;
      mediaType?: MediaType;
    }> = [];
    const seen = new Set<string>();
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/post/"]'),
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
        a.closest("[data-pressable-container], [role='article'], article") ??
        a.parentElement;

      const handle = pathname.match(/\/@([^/]+)\//)?.[1];
      const texts = Array.from(
        (card ?? a).querySelectorAll<HTMLElement>("[dir='auto']"),
      )
        .map((el) => (el.textContent ?? "").trim())
        .filter((t) => {
          if (!t) return false;
          if (handle && t.replace(/^@/, "") === handle) return false;
          if (/^Translate$/i.test(t)) return false;
          return t.length > 1;
        });
      const text = texts[0];

      const mediaUrls: Array<{
        url: string;
        type?: MediaType;
        poster?: string;
      }> = [];
      const seenMedia = new Set<string>();
      const push = (
        url: string | undefined,
        type: MediaType,
        poster?: string,
      ) => {
        if (!url || url.startsWith("data:") || url.startsWith("blob:")) return;
        if (norm.isBrandAsset(url) || seenMedia.has(url)) return;
        seenMedia.add(url);
        mediaUrls.push({ url, type, ...(poster ? { poster } : {}) });
      };

      for (const v of Array.from(
        (card ?? a).querySelectorAll<HTMLVideoElement>("video"),
      )) {
        const poster = v.poster || undefined;
        const src = v.currentSrc || v.src;
        push(src && !src.startsWith("blob:") ? src : poster, "video", poster);
      }
      for (const img of Array.from(
        (card ?? a).querySelectorAll<HTMLImageElement>("img"),
      )) {
        const best =
          norm.pickLargestSrcset(img.srcset) ?? img.currentSrc ?? img.src;
        if (!best) continue;
        if (norm.looksLikeAvatar(best, img.alt)) continue;
        push(best, "image");
      }

      const cleanUrl = href.split("?")[0] ?? href;
      out.push({
        sourceId: id,
        url: cleanUrl.startsWith("http")
          ? cleanUrl
          : `https://www.threads.com${cleanUrl}`,
        ...(text ? { title: norm.titleFromText(text) } : {}),
        ...(handle ? { author: handle } : {}),
        ...(mediaUrls.length > 0
          ? {
              mediaUrl: mediaUrls[0]?.url,
              mediaUrls,
              mediaType: mediaUrls[0]?.type ?? ("image" as MediaType),
            }
          : {}),
      });
    }
    return out;
  }

  return scroll({
    collectFn,
    knownIds: args.knownIds,
    hydrateSelector: 'a[href*="/post/"]',
  });
}
