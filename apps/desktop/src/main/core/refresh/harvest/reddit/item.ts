/// <reference lib="dom" />

import { buildItemExpression } from "../lib/expression";
import type { ScrapedHarvest } from "../types";
import { inPageRedditNormalize } from "./normalize";

export function buildExpression(postId: string): string {
  return buildItemExpression(
    inPageRedditNormalize,
    inPageRedditHarvest,
    postId,
  );
}

async function inPageRedditHarvest(
  _postId: string,
  norm: ReturnType<typeof inPageRedditNormalize>,
): Promise<unknown> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (
      document.querySelector("shreddit-post, h1") ||
      document.querySelector('meta[property="og:title"]')
    ) {
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return norm.extractPostMeta();
}

export function adapt(raw: unknown): ScrapedHarvest | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!o.title && !o.description && !o.mediaUrl) return null;
  const metaObj =
    o.meta && typeof o.meta === "object"
      ? (o.meta as Record<string, unknown>)
      : undefined;
  return {
    title: typeof o.title === "string" ? o.title : undefined,
    description: typeof o.description === "string" ? o.description : undefined,
    author: typeof o.author === "string" ? o.author : undefined,
    lang:
      typeof metaObj?.lang === "string" ? (metaObj.lang as string) : undefined,
    mediaUrl: typeof o.mediaUrl === "string" ? o.mediaUrl : undefined,
    mediaUrls: Array.isArray(o.mediaUrls)
      ? (o.mediaUrls as ScrapedHarvest["mediaUrls"])
      : undefined,
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
    if (/(?:^|\.)redd\.it$/i.test(u.hostname)) {
      return u.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    return (
      u.pathname.match(/\/comments\/([a-z0-9]+)/i)?.[1] ??
      u.pathname.match(/\/r\/[^/]+\/comments\/([a-z0-9]+)/i)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}
