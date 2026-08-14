/// <reference lib="dom" />

import { buildItemExpression } from "../lib/expression";
import type { ScrapedHarvest } from "../types";
import {
  inPageThreadsNormalize,
  isThreadsLandingCopy,
  isThreadsLandingMedia,
} from "./normalize";

export function buildExpression(code: string): string {
  return buildItemExpression(
    inPageThreadsNormalize,
    inPageThreadsHarvest,
    code,
  );
}

async function inPageThreadsHarvest(
  code: string,
  norm: ReturnType<typeof inPageThreadsNormalize>,
): Promise<unknown> {
  const pk = norm.shortcodeToPk(code);
  try {
    const res = await fetch(`/api/v1/media/${pk}/info/`, {
      method: "GET",
      credentials: "include",
      headers: {
        "x-ig-app-id": "238260118697367",
        "x-asbd-id": "129477",
        "x-requested-with": "XMLHttpRequest",
        accept: "*/*",
      },
    });
    if (res.ok) {
      const json = await res.json();
      const node = json?.items?.[0] ?? null;
      if (node) return norm.normalizeMediaNode(node);
    }
  } catch {
    /** Fall through to the DOM scrape. */
  }

  const articleDeadline = Date.now() + 12_000;
  let card: Element | null = null;
  while (Date.now() < articleDeadline) {
    const a = document.querySelector<HTMLAnchorElement>(
      `a[href*="/post/${code}"]`,
    );
    const candidate =
      a?.closest("[data-pressable-container], [role='article'], article") ??
      null;
    if (candidate) {
      card = candidate;
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!card) return null;
  const root = card;

  const countMedia = () => root.querySelectorAll("picture img, video").length;
  const mediaDeadline = Date.now() + 8_000;
  const stableMs = 800;
  let lastCount = 0;
  let stableSince = 0;
  while (Date.now() < mediaDeadline) {
    const count = countMedia();
    if (count > 0) {
      if (count === lastCount) {
        if (stableSince === 0) stableSince = Date.now();
        if (Date.now() - stableSince >= stableMs) break;
      } else {
        lastCount = count;
        stableSince = 0;
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return scrapeDom(root);

  function scrapeDom(root: Element): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    const meta: Record<string, unknown> = {};

    const handleLink = Array.from(
      root.querySelectorAll<HTMLAnchorElement>('a[href^="/@"]'),
    ).find((a) => /^\/@[A-Za-z0-9._]+\/?$/.test(a.getAttribute("href") ?? ""));
    const handle = handleLink
      ?.getAttribute("href")
      ?.match(/^\/@([A-Za-z0-9._]+)/)?.[1];
    if (handle) {
      out.author = `@${handle}`;
      meta.authorUrl = `https://www.threads.com/@${handle}`;
    }

    const texts = Array.from(root.querySelectorAll<HTMLElement>("[dir='auto']"))
      .map((el) => (el.textContent ?? "").trim())
      .filter((t) => {
        if (!t) return false;
        if (handle && t.replace(/^@/, "") === handle) return false;
        if (/^Translate$/i.test(t)) return false;
        if (/^\d+[smhd]$/i.test(t)) return false;
        if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(t)) return false;
        return true;
      });
    const caption = texts.find((t) => t.length > 1);
    if (caption) norm.applyCaption(out, caption);

    const time = root.querySelector<HTMLTimeElement>("time[datetime]");
    if (time?.dateTime) meta.publishedAt = time.dateTime;
    const htmlLang = document.documentElement.lang?.trim();
    if (htmlLang) {
      out.lang = htmlLang;
      meta.lang = htmlLang;
    }

    const media: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    const push = (entry: Record<string, unknown> | undefined) => {
      const url = entry && typeof entry.url === "string" ? entry.url : null;
      if (
        !entry ||
        !url ||
        /^blob:/i.test(url) ||
        norm.isBrandAsset(url) ||
        seen.has(url)
      ) {
        return;
      }
      seen.add(url);
      media.push(entry);
    };

    let avatarUrl: string | null = null;
    for (const v of Array.from(
      root.querySelectorAll<HTMLVideoElement>("video"),
    )) {
      const poster = v.poster || undefined;
      const src = v.currentSrc || v.src;
      const url = src && !src.startsWith("blob:") ? src : poster;
      if (!url) continue;
      const dur = v.duration;
      const w = v.videoWidth;
      const h = v.videoHeight;
      push({
        url,
        type: "video",
        ...(poster ? { poster } : {}),
        ...(Number.isFinite(dur) && dur > 0
          ? { durationSec: Math.round(dur) }
          : {}),
        ...(w ? { width: w } : {}),
        ...(h ? { height: h } : {}),
      });
    }
    for (const img of Array.from(
      root.querySelectorAll<HTMLImageElement>("img"),
    )) {
      const best =
        norm.pickLargestSrcset(img.srcset) ?? img.currentSrc ?? img.src;
      if (!best || best.startsWith("data:")) continue;
      if (norm.looksLikeAvatar(best, img.alt)) {
        if (!avatarUrl) avatarUrl = best;
        continue;
      }
      const alt = img.getAttribute("alt")?.trim();
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      push({
        url: best,
        type: "image",
        ...(alt ? { altText: alt } : {}),
        ...(w ? { width: w } : {}),
        ...(h ? { height: h } : {}),
      });
    }
    if (avatarUrl) meta.authorAvatar = avatarUrl;

    if (media.length > 0) {
      out.mediaUrls = media;
      out.mediaUrl = (media[0] as Record<string, unknown>).url;
      out.mediaType = (media[0] as Record<string, unknown>).type ?? "image";
      meta.media = media;
    }

    if (Object.keys(meta).length > 0) out.meta = meta;
    if (!out.author && !out.title && !out.mediaUrl) return null;
    return out;
  }
}

function dropLanding<T extends { url?: string }>(
  items: T[] | undefined,
): T[] | undefined {
  if (!items) return undefined;
  const kept = items.filter(
    (m) => typeof m.url === "string" && !isThreadsLandingMedia(m.url),
  );
  return kept.length > 0 ? kept : undefined;
}

export function adapt(raw: unknown): ScrapedHarvest | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title =
    typeof o.title === "string" && !isThreadsLandingCopy(o.title)
      ? o.title
      : undefined;
  const description =
    typeof o.description === "string" && !isThreadsLandingCopy(o.description)
      ? o.description
      : undefined;
  const mediaUrls = dropLanding(
    Array.isArray(o.mediaUrls)
      ? (o.mediaUrls as NonNullable<ScrapedHarvest["mediaUrls"]>)
      : undefined,
  );
  const mediaUrl =
    typeof o.mediaUrl === "string" && !isThreadsLandingMedia(o.mediaUrl)
      ? o.mediaUrl
      : mediaUrls?.[0]?.url;
  if (!title && !description && !mediaUrl && typeof o.author !== "string") {
    return null;
  }
  const metaObj =
    o.meta && typeof o.meta === "object"
      ? (o.meta as Record<string, unknown>)
      : undefined;
  if (metaObj && Array.isArray(metaObj.media)) {
    const media = dropLanding(metaObj.media as Array<{ url?: string }>);
    if (media) metaObj.media = media;
    else delete metaObj.media;
  }
  return {
    title,
    description,
    author: typeof o.author === "string" ? o.author : undefined,
    lang:
      typeof metaObj?.lang === "string" ? (metaObj.lang as string) : undefined,
    mediaUrl,
    mediaUrls,
    mediaType:
      typeof o.mediaType === "string"
        ? (o.mediaType as ScrapedHarvest["mediaType"])
        : undefined,
    meta: metaObj,
  };
}

export function sourceIdFromUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    return (
      u.pathname.match(/\/post\/([A-Za-z0-9_-]+)/)?.[1] ??
      u.pathname.match(/\/t\/([A-Za-z0-9_-]+)/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}
