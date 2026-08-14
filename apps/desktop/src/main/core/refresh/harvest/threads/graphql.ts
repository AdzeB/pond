import log from "electron-log/main.js";
import { z } from "zod";
import { isThreadsLandingMedia } from "./normalize";

const savedEnvelope = z.object({
  data: z.record(z.string(), z.unknown()),
});

let envelopeFailureLogged = false;

export interface SavedCapture {
  url: string;
  body: string;
  status?: number;
}

interface RichThreadMedia {
  url: string;
  type: "image" | "video";
  poster?: string;
  width?: number;
  height?: number;
  durationSec?: number;
}

interface RichThreadMetrics {
  likes: number;
  retweets: number;
  replies: number;
  quotes?: number;
}

interface RichThreadCard {
  url?: string;
  domain?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  large?: boolean;
}

export interface RichThread {
  postId: string;
  url: string;
  fullText: string;
  author: {
    handle: string;
    name: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  media: RichThreadMedia[];
  metrics: RichThreadMetrics;
  quoted?: RichThread;
  card?: RichThreadCard;
  isReply?: boolean;
  replyingTo?: string;
  publishedAt?: string;
  raw: unknown;
}

export function parseSavedResponses(
  captures: SavedCapture[],
): Map<string, RichThread> {
  const out = new Map<string, RichThread>();
  for (const cap of captures) {
    let json: unknown;
    try {
      json = parseGraphqlBody(cap.body);
    } catch (err) {
      log.warn("[pond threads-saved] capture body not JSON", cap.url, err);
      continue;
    }
    if (json == null) {
      log.warn("[pond threads-saved] capture body not JSON", cap.url);
      continue;
    }
    const env = savedEnvelope.safeParse(json);
    if (!env.success && !envelopeFailureLogged) {
      envelopeFailureLogged = true;
      log.warn(
        "[pond threads-saved] envelope schema drift",
        cap.url,
        env.error.issues.map((i) => i.path.join(".")).join(", "),
      );
    }
    for (const node of collectThreadPosts(json)) {
      const thread = shapeRichThread(node);
      if (thread) out.set(thread.postId, thread);
    }
  }
  return out;
}

function parseGraphqlBody(body: string): unknown {
  let s = body.trim();
  if (s.startsWith("for (;;);")) s = s.slice("for (;;);".length).trim();
  if (s.startsWith(")]}'")) {
    const nl = s.indexOf("\n");
    s = (nl === -1 ? s.replace(/^\)\]\}'/, "") : s.slice(nl + 1)).trim();
  }
  return JSON.parse(s);
}

/** Walks a GraphQL payload for post nodes; skips quoted/reposted children so they stay nested on the parent. */
export function collectThreadPosts(json: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<string>();
  walk(json, false, (obj) => {
    const code = typeof obj.code === "string" ? obj.code : null;
    if (!code || seen.has(code)) return;
    if (
      !obj.text_post_app_info &&
      !obj.user &&
      !obj.owner &&
      !obj.caption &&
      !obj.image_versions2
    )
      return;
    seen.add(code);
    out.push(obj);
  });
  return out;
}

function walk(
  value: unknown,
  skipCollect: boolean,
  visit: (obj: Record<string, unknown>) => void,
): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, skipCollect, visit);
    return;
  }
  const obj = value as Record<string, unknown>;
  if (!skipCollect) visit(obj);
  for (const [key, child] of Object.entries(obj)) {
    const nestedSkip =
      skipCollect ||
      key === "share_info" ||
      key === "quoted_post" ||
      key === "reposted_post";
    walk(child, nestedSkip, visit);
  }
}

export function shapeRichThread(raw: unknown): RichThread | null {
  const node = asRecord(raw);
  if (!node) return null;
  const postId = str(node.code);
  if (!postId) return null;

  const user = asRecord(node.user) ?? asRecord(node.owner);
  const handle = str(user?.username) ?? "";
  const url = handle
    ? `https://www.threads.com/@${handle}/post/${postId}`
    : `https://www.threads.com/t/${postId}`;

  const info = asRecord(node.text_post_app_info);
  const caption = captionText(node.caption);
  const media = collectNodeMedia(node);
  const quotedRaw = unwrapQuotedPost(asRecord(info?.share_info)?.quoted_post);
  const quoted =
    quotedRaw && str(quotedRaw.code) !== postId
      ? (shapeRichThread(quotedRaw) ?? undefined)
      : undefined;
  const card = pickCard(info);

  const likes = num(node.like_count) ?? 0;
  const replies = num(info?.direct_reply_count) ?? num(node.comment_count) ?? 0;
  const retweets = num(info?.repost_count) ?? 0;
  const quotes = num(info?.quote_count);

  const takenAt = num(node.taken_at);
  const publishedAt =
    takenAt != null ? new Date(takenAt * 1000).toISOString() : undefined;

  const avatarUrl = str(user?.profile_pic_url);
  return {
    postId,
    url,
    fullText: caption ?? "",
    author: {
      handle,
      name: str(user?.full_name) ?? handle,
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(user?.is_verified === true ? { verified: true } : {}),
    },
    media,
    metrics: {
      likes,
      retweets,
      replies,
      ...(quotes != null ? { quotes } : {}),
    },
    ...(quoted ? { quoted } : {}),
    ...(card ? { card } : {}),
    ...(info?.is_reply === true ? { isReply: true } : {}),
    ...(str(asRecord(info?.reply_to_author)?.username)
      ? { replyingTo: str(asRecord(info?.reply_to_author)?.username) }
      : {}),
    ...(publishedAt ? { publishedAt } : {}),
    raw: node,
  };
}

function collectNodeMedia(node: Record<string, unknown>): RichThreadMedia[] {
  const media: RichThreadMedia[] = [];
  const seen = new Set<string>();
  const push = (entry: RichThreadMedia | null) => {
    if (!entry || seen.has(entry.url) || isThreadsLandingMedia(entry.url)) {
      return;
    }
    seen.add(entry.url);
    media.push(entry);
  };

  const carousel = node.carousel_media;
  if (node.media_type === 8 && Array.isArray(carousel)) {
    for (const child of carousel) {
      const rec = asRecord(child);
      if (!rec) continue;
      push(mediaFromVersions(rec));
    }
    return media;
  }
  push(mediaFromVersions(node));
  return media;
}

function mediaFromVersions(
  node: Record<string, unknown>,
): RichThreadMedia | null {
  const img = pickBestImage(asRecord(node.image_versions2));
  const video = pickBestVideo(node.video_versions);
  const width = num(node.original_width) ?? img?.width ?? video?.width;
  const height = num(node.original_height) ?? img?.height ?? video?.height;
  const dur = num(node.video_duration);
  if (node.media_type === 2 || video) {
    const src = video ?? img;
    if (!src) return null;
    return {
      url: src.url,
      type: "video",
      ...(img ? { poster: img.url } : {}),
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(dur != null ? { durationSec: Math.round(dur) } : {}),
    };
  }
  if (!img) return null;
  return {
    url: img.url,
    type: "image",
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

function pickBestImage(
  iv2: Record<string, unknown> | null,
): { url: string; width?: number; height?: number } | null {
  if (!iv2) return null;
  const cands = Array.isArray(iv2.candidates) ? iv2.candidates : [];
  let best: { url: string; width: number; height?: number } | null = null;
  for (const c of cands) {
    const rec = asRecord(c);
    const url = str(rec?.url);
    if (!url) continue;
    const w = num(rec?.width) ?? 0;
    const h = num(rec?.height);
    if (!best || w > best.width) {
      best = { url, width: w, ...(h ? { height: h } : {}) };
    }
  }
  return best;
}

function pickBestVideo(
  versions: unknown,
): { url: string; width?: number; height?: number } | null {
  if (!Array.isArray(versions)) return null;
  for (const v of versions) {
    const rec = asRecord(v);
    const url = str(rec?.url);
    if (!url) continue;
    const w = num(rec?.width);
    const h = num(rec?.height);
    return {
      url,
      ...(w ? { width: w } : {}),
      ...(h ? { height: h } : {}),
    };
  }
  return null;
}

function pickCard(
  info: Record<string, unknown> | null,
): RichThreadCard | undefined {
  const att =
    asRecord(info?.link_preview_attachment) ??
    asRecord(info?.link_preview_response);
  if (!att) return undefined;
  const url = str(att.url) ?? str(att.display_url);
  const title = str(att.title);
  const description = str(att.description);
  const image = asRecord(att.image);
  const imageUrl = str(att.image_url) ?? str(image?.url) ?? str(image?.uri);
  if (!url && !title && !imageUrl) return undefined;
  let domain = str(att.display_url);
  if (url) {
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /** Keep display_url when the href isn't absolute. */
    }
  }
  if (domain) domain = domain.replace(/^www\./, "").split("/")[0];
  return {
    ...(url ? { url } : {}),
    ...(domain ? { domain } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

function unwrapQuotedPost(raw: unknown): Record<string, unknown> | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  if (typeof rec.code === "string" || rec.user || rec.owner) return rec;
  return asRecord(rec.post) ?? asRecord(rec.media);
}

function captionText(caption: unknown): string | undefined {
  if (caption && typeof caption === "object") {
    return str((caption as { text?: unknown }).text);
  }
  return str(caption);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
