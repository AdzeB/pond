import type { MediaType, Source } from "@pond/schema/db";
import type {
  Capture,
  CaptureAuthor,
  CaptureMedia,
  CaptureMetrics,
  CaptureUpstream,
} from "@pond/schema/raw";

export interface HarvestAdaptCtx {
  source: Source;
  url: string;
  sourceId: string;
}

export interface PageBlob {
  title?: string;
  description?: string;
  author?: string;
  lang?: string;
  mediaUrl?: string;
  mediaUrls?: Array<{ url: string; type?: MediaType; poster?: string }>;
  mediaType?: MediaType;
  meta?: Record<string, unknown>;
}

export function parsePageBlob(raw: unknown): PageBlob | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const meta =
    o.meta && typeof o.meta === "object"
      ? (o.meta as Record<string, unknown>)
      : undefined;
  const title = typeof o.title === "string" ? o.title : undefined;
  const description =
    typeof o.description === "string" ? o.description : undefined;
  const author = typeof o.author === "string" ? o.author : undefined;
  const mediaUrl = typeof o.mediaUrl === "string" ? o.mediaUrl : undefined;
  if (!title && !description && !mediaUrl && !author) return null;
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(author ? { author } : {}),
    lang:
      typeof o.lang === "string"
        ? o.lang
        : typeof meta?.lang === "string"
          ? meta.lang
          : undefined,
    ...(mediaUrl ? { mediaUrl } : {}),
    mediaUrls: Array.isArray(o.mediaUrls)
      ? (o.mediaUrls as PageBlob["mediaUrls"])
      : undefined,
    mediaType:
      typeof o.mediaType === "string" ? (o.mediaType as MediaType) : undefined,
    ...(meta ? { meta } : {}),
  };
}

export function captureFromPageDom(
  raw: unknown,
  ctx: HarvestAdaptCtx,
): Capture | null {
  const page = parsePageBlob(raw);
  if (!page) return null;
  const meta = page.meta ?? {};
  const media = mediaFromPage(page, ctx);
  const author = authorFromPage(page.author, meta);
  const metrics = metricsFromMeta(meta);
  const extras = extrasFromMeta(meta);
  const upstream = upstreamFromMeta(meta);
  const duration =
    typeof meta.durationSec === "number" ? meta.durationSec : undefined;

  return {
    id: ctx.sourceId,
    source: ctx.source,
    url: ctx.url,
    ...(page.title ? { title: page.title } : {}),
    ...(page.description ? { description: page.description } : {}),
    ...(author ? { author } : {}),
    ...(typeof meta.publishedAt === "string"
      ? { publishedAt: meta.publishedAt }
      : {}),
    ...(page.lang ? { lang: page.lang } : {}),
    media,
    ...(metrics ? { metrics } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(upstream ? { upstream } : {}),
    ...(extras ? { extras } : {}),
  };
}

function mediaFromPage(page: PageBlob, ctx: HarvestAdaptCtx): CaptureMedia[] {
  if (ctx.source === "youtube") {
    const posterUrl =
      page.mediaUrl && page.mediaUrl.length > 0
        ? page.mediaUrl
        : `https://i.ytimg.com/vi/${ctx.sourceId}/hqdefault.jpg`;
    return [{ url: ctx.url, type: "video", posterUrl }];
  }

  const media: CaptureMedia[] = (page.mediaUrls ?? []).map((m) => ({
    url: m.url,
    type: m.type === "video" ? "video" : "image",
    ...(m.poster ? { posterUrl: m.poster } : {}),
  }));

  const meta = page.meta ?? {};
  const upstreamUrl =
    typeof meta.upstreamUrl === "string" ? meta.upstreamUrl : undefined;
  if (
    ctx.source === "cosmos" &&
    upstreamUrl &&
    !media.some((m) => m.type === "video")
  ) {
    media.push({
      url: upstreamUrl,
      type: "video",
      ...(media[0]?.url ? { posterUrl: media[0].url } : {}),
    });
  }
  return media;
}

function authorFromPage(
  author: string | undefined,
  meta: Record<string, unknown>,
): CaptureAuthor | undefined {
  const handle = author
    ? author.replace(/^u\//, "").replace(/^@/, "")
    : undefined;
  const next: CaptureAuthor = {
    ...(typeof meta.authorName === "string" ? { name: meta.authorName } : {}),
    ...(handle ? { handle } : {}),
    ...(typeof meta.authorAvatar === "string"
      ? { avatarUrl: meta.authorAvatar }
      : {}),
    ...(typeof meta.authorUrl === "string"
      ? { profileUrl: meta.authorUrl }
      : {}),
    ...(meta.verified === true ? { verified: true } : {}),
  };
  if (
    !next.name &&
    author &&
    !author.startsWith("@") &&
    !author.startsWith("u/")
  ) {
    next.name = author;
    delete next.handle;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function metricsFromMeta(
  meta: Record<string, unknown>,
): CaptureMetrics | undefined {
  const raw =
    meta.metrics && typeof meta.metrics === "object"
      ? (meta.metrics as Record<string, unknown>)
      : meta;
  const out: CaptureMetrics = {};
  for (const key of [
    "likes",
    "views",
    "plays",
    "comments",
    "replies",
    "retweets",
    "quotes",
    "bookmarks",
    "shares",
  ] as const) {
    const v = raw[key] ?? meta[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function extrasFromMeta(
  meta: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const extras: Record<string, unknown> = {};
  if (typeof meta.subreddit === "string") extras.subreddit = meta.subreddit;
  if (typeof meta.tileType === "string") extras.tileType = meta.tileType;
  if (meta.clusters) extras.clusters = meta.clusters;
  if (typeof meta.publisher === "string") extras.publisher = meta.publisher;
  if (typeof meta.faviconUrl === "string") extras.faviconUrl = meta.faviconUrl;
  if (typeof meta.blockClass === "string") extras.blockClass = meta.blockClass;
  return Object.keys(extras).length > 0 ? extras : undefined;
}

function upstreamFromMeta(
  meta: Record<string, unknown>,
): CaptureUpstream | undefined {
  const url =
    typeof meta.upstreamUrl === "string" ? meta.upstreamUrl : undefined;
  if (!url) return undefined;
  try {
    return { url, host: new URL(url).host };
  } catch {
    return undefined;
  }
}
