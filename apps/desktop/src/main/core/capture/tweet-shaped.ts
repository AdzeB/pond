import type {
  Capture,
  CaptureAuthor,
  CaptureLinkCard,
  CaptureMedia,
  CaptureMetrics,
} from "@pond/schema/raw";
import { QUOTE_DEPTH_CAP } from "@pond/schema/raw";
import { pickTitle } from "../refresh/harvest/lib/title";

export interface TweetShapedDraft {
  source: "twitter" | "threads";
  id: string;
  url: string;
  text?: string;
  title?: string;
  author?: CaptureAuthor;
  publishedAt?: string;
  lang?: string;
  media: CaptureMedia[];
  metrics?: CaptureMetrics;
  quoted?: TweetShapedDraft;
  card?: CaptureLinkCard;
  isReply?: boolean;
  replyingTo?: string;
  conversationId?: string;
}

export function captureFromTweetShaped(
  draft: TweetShapedDraft,
  depth = 0,
): Capture {
  const title = draft.title ?? pickTitle(draft.text ?? "") ?? undefined;
  const author = compactAuthor(draft.author);
  const quoted =
    draft.quoted && depth < QUOTE_DEPTH_CAP
      ? captureFromTweetShaped(draft.quoted, depth + 1)
      : undefined;
  const card = compactCard(draft.card);
  const metrics = compactMetrics(draft.metrics);

  return {
    id: draft.id,
    source: draft.source,
    url: draft.url,
    ...(title ? { title } : {}),
    ...(draft.text ? { description: draft.text } : {}),
    ...(author ? { author } : {}),
    ...(draft.publishedAt ? { publishedAt: draft.publishedAt } : {}),
    ...(draft.lang ? { lang: draft.lang } : {}),
    media: draft.media,
    ...(metrics ? { metrics } : {}),
    ...(quoted ? { quoted } : {}),
    ...(card ? { card } : {}),
    ...(draft.isReply ? { isReply: true } : {}),
    ...(draft.replyingTo ? { replyingTo: draft.replyingTo } : {}),
    ...(draft.conversationId ? { conversationId: draft.conversationId } : {}),
  };
}

function compactAuthor(
  author: CaptureAuthor | undefined,
): CaptureAuthor | undefined {
  if (!author) return undefined;
  const next: CaptureAuthor = {
    ...(author.name ? { name: author.name } : {}),
    ...(author.handle ? { handle: author.handle } : {}),
    ...(author.avatarUrl ? { avatarUrl: author.avatarUrl } : {}),
    ...(author.profileUrl ? { profileUrl: author.profileUrl } : {}),
    ...(author.verified ? { verified: true } : {}),
  };
  return Object.keys(next).length > 0 ? next : undefined;
}

function compactCard(
  card: CaptureLinkCard | undefined,
): CaptureLinkCard | undefined {
  if (!card) return undefined;
  const next: CaptureLinkCard = {
    ...(card.url ? { url: card.url } : {}),
    ...(card.domain ? { domain: card.domain } : {}),
    ...(card.title ? { title: card.title } : {}),
    ...(card.description ? { description: card.description } : {}),
    ...(card.imageUrl ? { imageUrl: card.imageUrl } : {}),
    ...(card.large ? { large: true } : {}),
  };
  if (!next.url && !next.title && !next.imageUrl) return undefined;
  return next;
}

function compactMetrics(
  metrics: CaptureMetrics | undefined,
): CaptureMetrics | undefined {
  if (!metrics) return undefined;
  return Object.keys(metrics).length > 0 ? { ...metrics } : undefined;
}

export interface RichPostMedia {
  url: string;
  type: "image" | "video";
  poster?: string;
  width?: number;
  height?: number;
  durationSec?: number;
}

export interface RichPostDraft {
  source: "twitter" | "threads";
  id: string;
  url: string;
  text: string;
  author: {
    handle: string;
    name: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  media: RichPostMedia[];
  metrics?: CaptureMetrics;
  quoted?: RichPostDraft;
  card?: CaptureLinkCard;
  isReply?: boolean;
  replyingTo?: string;
  publishedAt?: string;
}

export function draftFromRichPost(rich: RichPostDraft): TweetShapedDraft {
  return {
    source: rich.source,
    id: rich.id,
    url: rich.url,
    text: rich.text,
    author: {
      ...(rich.author.name ? { name: rich.author.name } : {}),
      ...(rich.author.handle ? { handle: rich.author.handle } : {}),
      ...(rich.author.avatarUrl ? { avatarUrl: rich.author.avatarUrl } : {}),
      ...(rich.author.verified ? { verified: true } : {}),
    },
    ...(rich.publishedAt ? { publishedAt: rich.publishedAt } : {}),
    media: rich.media.map(mediaFromRich),
    ...(rich.metrics ? { metrics: rich.metrics } : {}),
    ...(rich.quoted ? { quoted: draftFromRichPost(rich.quoted) } : {}),
    ...(rich.card ? { card: rich.card } : {}),
    ...(rich.isReply ? { isReply: true } : {}),
    ...(rich.replyingTo ? { replyingTo: rich.replyingTo } : {}),
  };
}

function mediaFromRich(m: RichPostMedia): CaptureMedia {
  return {
    url: m.url,
    type: m.type === "video" ? "video" : "image",
    ...(m.poster ? { posterUrl: m.poster } : {}),
    ...(typeof m.width === "number" ? { width: m.width } : {}),
    ...(typeof m.height === "number" ? { height: m.height } : {}),
    ...(typeof m.durationSec === "number"
      ? { durationSec: m.durationSec }
      : {}),
  };
}

export interface DomHarvestPage {
  source: "twitter" | "threads";
  id: string;
  url: string;
  title?: string;
  description?: string;
  author?: string;
  lang?: string;
  mediaUrls?: Array<{ url: string; type?: string; poster?: string }>;
  meta?: Record<string, unknown>;
}

export function draftFromDomHarvest(page: DomHarvestPage): TweetShapedDraft {
  const meta = page.meta ?? {};
  const quotedRaw =
    meta.quotedTweet && typeof meta.quotedTweet === "object"
      ? (meta.quotedTweet as Record<string, unknown>)
      : undefined;
  return {
    source: page.source,
    id: page.id,
    url: page.url,
    ...(page.description ? { text: page.description } : {}),
    ...(page.title ? { title: page.title } : {}),
    author: {
      ...(typeof meta.authorName === "string" ? { name: meta.authorName } : {}),
      ...(typeof page.author === "string"
        ? { handle: page.author.replace(/^@/, "") }
        : {}),
      ...(typeof meta.authorAvatar === "string"
        ? { avatarUrl: meta.authorAvatar }
        : {}),
      ...(typeof meta.authorUrl === "string"
        ? { profileUrl: meta.authorUrl }
        : {}),
      ...(meta.verified === true ? { verified: true } : {}),
    },
    ...(typeof meta.publishedAt === "string"
      ? { publishedAt: meta.publishedAt }
      : {}),
    ...(page.lang ? { lang: page.lang } : {}),
    media: buildMedia(meta.media, page.mediaUrls),
    metrics: pickMetrics(meta.metrics),
    ...(quotedRaw
      ? { quoted: draftFromQuotedMeta(page.source, quotedRaw) }
      : {}),
    ...(meta.card && typeof meta.card === "object"
      ? { card: meta.card as CaptureLinkCard }
      : {}),
    ...(meta.isReply === true ? { isReply: true } : {}),
    ...(typeof meta.replyingTo === "string"
      ? { replyingTo: meta.replyingTo }
      : {}),
    ...(typeof meta.conversationId === "string"
      ? { conversationId: meta.conversationId }
      : {}),
  };
}

function draftFromQuotedMeta(
  source: "twitter" | "threads",
  raw: Record<string, unknown>,
): TweetShapedDraft {
  const handle =
    typeof raw.author === "string" ? raw.author.replace(/^@/, "") : undefined;
  const id =
    typeof raw.tweetId === "string"
      ? raw.tweetId
      : typeof raw.url === "string"
        ? raw.url
        : "quoted";
  return {
    source,
    id,
    url: typeof raw.url === "string" ? raw.url : "",
    ...(typeof raw.text === "string" ? { text: raw.text } : {}),
    author: {
      ...(typeof raw.authorName === "string" ? { name: raw.authorName } : {}),
      ...(handle ? { handle } : {}),
      ...(typeof raw.authorAvatar === "string"
        ? { avatarUrl: raw.authorAvatar }
        : {}),
    },
    media: buildMedia(raw.media, undefined),
  };
}

function buildMedia(
  metaMedia: unknown,
  mediaUrls: Array<{ url: string; type?: string; poster?: string }> | undefined,
): CaptureMedia[] {
  const rich = Array.isArray(metaMedia)
    ? (metaMedia as Array<Record<string, unknown>>).filter(
        (m) => typeof m.url === "string",
      )
    : [];
  const out: CaptureMedia[] = [];
  const seen = new Set<string>();
  const push = (m: CaptureMedia): void => {
    if (seen.has(m.url)) return;
    seen.add(m.url);
    out.push(m);
  };
  if (rich.length > 0) {
    for (const m of rich) {
      push({
        url: m.url as string,
        type: m.type === "video" ? "video" : "image",
        ...(typeof m.poster === "string" ? { posterUrl: m.poster } : {}),
        ...(typeof m.width === "number" ? { width: m.width } : {}),
        ...(typeof m.height === "number" ? { height: m.height } : {}),
        ...(typeof m.durationSec === "number"
          ? { durationSec: m.durationSec }
          : {}),
      });
    }
    return out;
  }
  for (const m of mediaUrls ?? []) {
    push({
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      ...(m.poster ? { posterUrl: m.poster } : {}),
    });
  }
  return out;
}

function pickMetrics(raw: unknown): CaptureMetrics | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const out: CaptureMetrics = {};
  for (const key of [
    "likes",
    "retweets",
    "replies",
    "quotes",
    "views",
    "bookmarks",
    "comments",
    "plays",
  ] as const) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
