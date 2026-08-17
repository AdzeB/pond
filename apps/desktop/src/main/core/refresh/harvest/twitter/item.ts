import type { ScrapedHarvest } from "../types";
import { harvestSource } from "./item-source";
import { inPageTwitterNormalize } from "./normalize";

export function adapt(raw: unknown): ScrapedHarvest | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    title: typeof o.title === "string" ? o.title : undefined,
    description: typeof o.description === "string" ? o.description : undefined,
    author: typeof o.author === "string" ? o.author : undefined,
    lang: typeof o.lang === "string" ? o.lang : undefined,
    mediaUrl: typeof o.mediaUrl === "string" ? o.mediaUrl : undefined,
    mediaUrls: Array.isArray(o.mediaUrls)
      ? (o.mediaUrls as ScrapedHarvest["mediaUrls"])
      : undefined,
    mediaType:
      typeof o.mediaType === "string"
        ? (o.mediaType as ScrapedHarvest["mediaType"])
        : undefined,
    meta:
      o.meta && typeof o.meta === "object"
        ? (o.meta as Record<string, unknown>)
        : undefined,
  };
}

export function sourceIdFromUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    const m = u.pathname.match(/\/status\/(\d+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function buildExpression(tweetId: string): string {
  const normSrc = `(${inPageTwitterNormalize.toString()})()`;
  const fnSrc = harvestSource();
  return `(async () => {
    const norm = ${normSrc};
    const fn = ${fnSrc};
    const tweetId = ${JSON.stringify(tweetId)};
    const articleDeadline = Date.now() + 12_000;
    let article = null;
    while (Date.now() < articleDeadline) {
      const a = document.querySelector('a[href*="/status/' + tweetId + '"]');
      const candidate = a && a.closest('article');
      if (candidate) { article = candidate; break; }
      await new Promise(r => setTimeout(r, 250));
    }
    if (article) {
      /** Twitter lazy-loads grid/carousel images, so the first <img> appears well before the rest; wait until the media element count stays stable or the deadline hits. */
      const countMedia = () => article.querySelectorAll(
        '[data-testid="tweetPhoto"] img, video, [data-testid="videoPlayer"] img, [data-testid="videoComponent"] img'
      ).length;
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
        await new Promise(r => setTimeout(r, 200));
      }
    }
    try { return fn(tweetId, norm); } catch (e) { return null; }
  })()`;
}
