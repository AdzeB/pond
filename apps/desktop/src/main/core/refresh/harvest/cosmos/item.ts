/// <reference lib="dom" />

import { buildItemExpression } from "../lib/expression";
import type { ScrapedHarvest } from "../types";
import { inPageCosmosNormalize } from "./normalize";

export function buildExpression(elementId: string): string {
  return buildItemExpression(
    inPageCosmosNormalize,
    inPageCosmosHarvest,
    elementId,
  );
}

async function inPageCosmosHarvest(
  _elementId: string,
  norm: ReturnType<typeof inPageCosmosNormalize>,
): Promise<unknown> {
  const deadline = Date.now() + 12_000;
  /** Wait for the server-rendered `og:image` meta or a hydrated <video>; DOM <img>s are sidebar covers and skeletons that mislead. */
  const ready = (): boolean =>
    !!document.querySelector('meta[property="og:image"]') ||
    !!document.querySelector("main video[src], video[src]");
  while (Date.now() < deadline) {
    if (ready()) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  return norm.extractElementPageMeta();
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
    return u.pathname.match(/\/e\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}
