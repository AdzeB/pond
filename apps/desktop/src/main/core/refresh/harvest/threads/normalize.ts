/// <reference lib="dom" />

/** Threads' static brand OG (the black logo tile) lives on rsrc.php, never on post CDN paths. */
export function isThreadsLandingMedia(url: string): boolean {
  return /static\.cdninstagram\.com\/rsrc\.php\//i.test(url);
}

/** SSR shell copy served for every unhydrated Threads URL. */
export function isThreadsLandingCopy(text: string): boolean {
  const t = text.trim();
  return (
    /^Join Threads to share ideas/i.test(t) || /^Threads\s*•\s*Log in$/i.test(t)
  );
}

/** True when a live Threads save is the landing-page logo tile, not a real post. */
export function isLandingOgThreadsSave(row: {
  source: string;
  title?: string | null;
  description?: string | null;
  rawJson?: unknown;
}): boolean {
  if (row.source !== "threads") return false;
  if (row.title && isThreadsLandingCopy(row.title)) return true;
  if (row.description && isThreadsLandingCopy(row.description)) return true;
  const capture = (row.rawJson as { capture?: Record<string, unknown> } | null)
    ?.capture;
  if (!capture) return false;
  if (
    typeof capture.title === "string" &&
    isThreadsLandingCopy(capture.title)
  ) {
    return true;
  }
  if (
    typeof capture.description === "string" &&
    isThreadsLandingCopy(capture.description)
  ) {
    return true;
  }
  const media = capture.media;
  if (Array.isArray(media)) {
    for (const m of media) {
      const url = (m as { url?: unknown })?.url;
      if (typeof url === "string" && isThreadsLandingMedia(url)) return true;
    }
  }
  return false;
}

export function inPageThreadsNormalize() {
  const ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  function shortcodeToPk(code: string): string {
    let n = 0n;
    for (const ch of code) {
      n = n * 64n + BigInt(ALPHABET.indexOf(ch));
    }
    return n.toString();
  }

  function pickLargestSrcset(srcset: string | null): string | undefined {
    if (!srcset) return undefined;
    const parts = srcset
      .split(",")
      .map((p) => p.trim())
      .map((p) => {
        const [u, sz] = p.split(/\s+/);
        return { u, w: sz ? Number.parseInt(sz, 10) : 0 };
      })
      .filter((p) => p.u);
    if (!parts.length) return undefined;
    parts.sort((a, b) => b.w - a.w);
    return parts[0]?.u;
  }

  function looksLikeAvatar(url: string, alt?: string): boolean {
    if (alt && /profile picture/i.test(alt)) return true;
    if (/\/t51\.\d+-19\//.test(url)) return true;
    if (/profile_pic/i.test(url)) return true;
    return false;
  }

  function isBrandAsset(url: string): boolean {
    return /static\.cdninstagram\.com\/rsrc\.php\//i.test(url);
  }

  function pickBestImage(
    iv2: {
      candidates?: Array<{ url?: string; width?: number; height?: number }>;
    } | null,
  ): { url: string; width?: number; height?: number } | null {
    if (!iv2) return null;
    const cands = iv2.candidates || [];
    let best: { url: string; width: number; height?: number } | null = null;
    for (const c of cands) {
      if (typeof c?.url !== "string") continue;
      const w = Number(c.width) || 0;
      const h = Number(c.height) || 0;
      if (!best || w > best.width) {
        best = { url: c.url, width: w, ...(h ? { height: h } : {}) };
      }
    }
    if (!best) return null;
    return {
      url: best.url,
      ...(best.width ? { width: best.width } : {}),
      ...(best.height ? { height: best.height } : {}),
    };
  }

  function pickBestVideo(
    versions: Array<{ url?: string; width?: number; height?: number }> | null,
  ): { url: string; width?: number; height?: number } | null {
    if (!Array.isArray(versions)) return null;
    for (const v of versions) {
      if (typeof v?.url !== "string") continue;
      const w = Number(v.width) || 0;
      const h = Number(v.height) || 0;
      return {
        url: v.url,
        ...(w ? { width: w } : {}),
        ...(h ? { height: h } : {}),
      };
    }
    return null;
  }

  function titleFromText(text: string): string {
    const firstLine = text.split(/\n+/)[0]?.trim() ?? text;
    return firstLine.length <= 90
      ? firstLine
      : `${firstLine.slice(0, 89).trimEnd()}…`;
  }

  function applyCaption(out: Record<string, unknown>, text: string): void {
    out.description = text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
    out.title = titleFromText(text);
  }

  function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  }

  function str(v: unknown): string | undefined {
    return typeof v === "string" && v.length > 0 ? v : undefined;
  }

  function captionText(caption: unknown): string | undefined {
    if (caption && typeof caption === "object") {
      return str((caption as { text?: unknown }).text);
    }
    return str(caption);
  }

  type MediaNode = {
    media_type?: number;
    accessibility_caption?: string;
    video_duration?: number;
    original_width?: number;
    original_height?: number;
    image_versions2?: {
      candidates?: Array<{ url?: string; width?: number; height?: number }>;
    };
    video_versions?: Array<{
      url?: string;
      width?: number;
      height?: number;
    }>;
    carousel_media?: MediaNode[];
  };

  function collectNodeMedia(node: MediaNode): Array<Record<string, unknown>> {
    const media: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    const push = (entry: Record<string, unknown> | null) => {
      const url = entry && typeof entry.url === "string" ? entry.url : null;
      if (!url || /^blob:/i.test(url) || isBrandAsset(url) || seen.has(url)) {
        return;
      }
      seen.add(url);
      media.push(entry as Record<string, unknown>);
    };

    const dims = (
      img: { width?: number; height?: number } | null,
      nodeW?: number,
      nodeH?: number,
    ): { width?: number; height?: number } => {
      const width = nodeW || img?.width;
      const height = nodeH || img?.height;
      return {
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      };
    };

    if (node.media_type === 8 && Array.isArray(node.carousel_media)) {
      for (const child of node.carousel_media) {
        const altText =
          typeof child.accessibility_caption === "string"
            ? child.accessibility_caption
            : undefined;
        const dur =
          typeof child.video_duration === "number"
            ? Math.round(child.video_duration)
            : undefined;
        if (child.media_type === 2) {
          const v = pickBestVideo(child.video_versions ?? null);
          const img = pickBestImage(child.image_versions2 ?? null);
          const src = v ?? img;
          if (!src) continue;
          push({
            url: src.url,
            type: "video",
            ...(img ? { poster: img.url } : {}),
            ...(altText ? { altText } : {}),
            ...(dur ? { durationSec: dur } : {}),
            ...dims(v ?? img, child.original_width, child.original_height),
          });
        } else {
          const img = pickBestImage(child.image_versions2 ?? null);
          if (!img) continue;
          push({
            url: img.url,
            type: "image",
            ...(altText ? { altText } : {}),
            ...dims(img, child.original_width, child.original_height),
          });
        }
      }
    } else if (node.media_type === 2) {
      const v = pickBestVideo(node.video_versions ?? null);
      const img = pickBestImage(node.image_versions2 ?? null);
      const src = v ?? img;
      if (src) {
        const dur =
          typeof node.video_duration === "number"
            ? Math.round(node.video_duration)
            : undefined;
        push({
          url: src.url,
          type: "video",
          ...(img ? { poster: img.url } : {}),
          ...(dur ? { durationSec: dur } : {}),
          ...dims(v ?? img, node.original_width, node.original_height),
        });
      }
    } else {
      const img = pickBestImage(node.image_versions2 ?? null);
      if (img) {
        const altText =
          typeof node.accessibility_caption === "string"
            ? node.accessibility_caption
            : undefined;
        push({
          url: img.url,
          type: "image",
          ...(altText ? { altText } : {}),
          ...dims(img, node.original_width, node.original_height),
        });
      }
    }
    return media;
  }

  function unwrapQuotedPost(raw: unknown): Record<string, unknown> | null {
    const rec = asRecord(raw);
    if (!rec) return null;
    if (typeof rec.code === "string" || rec.user || rec.owner) return rec;
    const nested = asRecord(rec.post) ?? asRecord(rec.media);
    return nested;
  }

  function quotedFromShare(
    info: Record<string, unknown> | null | undefined,
    parentCode: string,
  ): Record<string, unknown> | null {
    const share = asRecord(info?.share_info);
    if (!share) return null;
    const quotedNode = unwrapQuotedPost(share.quoted_post);
    if (!quotedNode) return null;
    const code = str(quotedNode.code);
    if (code && code === parentCode) return null;

    const user = asRecord(quotedNode.user) ?? asRecord(quotedNode.owner);
    const handle = str(user?.username);
    const text = captionText(quotedNode.caption);
    const media = collectNodeMedia(quotedNode as MediaNode);
    if (!handle && !text && media.length === 0) return null;

    const quoted: Record<string, unknown> = {};
    if (code) quoted.tweetId = code;
    if (handle && code) {
      quoted.url = `https://www.threads.com/@${handle}/post/${code}`;
    } else if (code) {
      quoted.url = `https://www.threads.com/t/${code}`;
    }
    if (handle) quoted.author = `@${handle}`;
    if (str(user?.full_name)) quoted.authorName = user?.full_name;
    if (str(user?.profile_pic_url)) quoted.authorAvatar = user?.profile_pic_url;
    if (text) quoted.text = text;
    if (media.length > 0) quoted.media = media;
    return quoted;
  }

  function cardFromPreview(
    info: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null {
    const att =
      asRecord(info?.link_preview_attachment) ??
      asRecord(info?.link_preview_response);
    if (!att) return null;
    const url = str(att.url) ?? str(att.display_url);
    const title = str(att.title);
    const description = str(att.description);
    const image = asRecord(att.image) ?? asRecord(att.image_versions2);
    const imageUrl =
      str(att.image_url) ?? str(image?.url) ?? str(asRecord(image)?.uri);
    if (!url && !title && !imageUrl) return null;
    let domain: string | undefined = str(att.display_url);
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

  function normalizeMediaNode(node: {
    pk?: string | number;
    code?: string;
    media_type?: number;
    taken_at?: number;
    like_count?: number;
    comment_count?: number;
    video_duration?: number;
    original_width?: number;
    original_height?: number;
    accessibility_caption?: string;
    caption?: { text?: string } | string | null;
    user?: {
      username?: string;
      full_name?: string;
      profile_pic_url?: string;
      is_verified?: boolean;
    };
    owner?: {
      username?: string;
      full_name?: string;
      profile_pic_url?: string;
      is_verified?: boolean;
    };
    image_versions2?: {
      candidates?: Array<{ url?: string; width?: number; height?: number }>;
    };
    video_versions?: Array<{
      url?: string;
      width?: number;
      height?: number;
    }>;
    carousel_media?: Array<{
      media_type?: number;
      accessibility_caption?: string;
      video_duration?: number;
      original_width?: number;
      original_height?: number;
      image_versions2?: {
        candidates?: Array<{ url?: string; width?: number; height?: number }>;
      };
      video_versions?: Array<{
        url?: string;
        width?: number;
        height?: number;
      }>;
    }>;
    text_post_app_info?: {
      direct_reply_count?: number;
      quote_count?: number;
      repost_count?: number;
      is_reply?: boolean;
      reply_to_author?: { username?: string };
      share_info?: {
        quoted_post?: unknown;
        reposted_post?: unknown;
      };
      link_preview_attachment?: unknown;
      link_preview_response?: unknown;
    };
  }): Record<string, unknown> | null {
    const code = typeof node.code === "string" ? node.code : null;
    if (!code) return null;

    const user = node.user ?? node.owner;
    const handle = user?.username;
    const out: Record<string, unknown> = {};
    const meta: Record<string, unknown> = {};

    if (handle) {
      out.author = `@${handle}`;
      meta.authorUrl = `https://www.threads.com/@${handle}`;
      if (user?.full_name) meta.authorName = user.full_name;
      if (user?.profile_pic_url) meta.authorAvatar = user.profile_pic_url;
      if (typeof user?.is_verified === "boolean") {
        meta.verified = user.is_verified;
      }
    }

    if (typeof node.taken_at === "number") {
      meta.publishedAt = new Date(node.taken_at * 1000).toISOString();
    }

    const htmlLang =
      typeof document !== "undefined"
        ? document.documentElement.lang?.trim()
        : null;
    if (htmlLang) {
      out.lang = htmlLang;
      meta.lang = htmlLang;
    }

    const info = node.text_post_app_info;
    const metrics: Record<string, number> = {};
    if (typeof node.like_count === "number") metrics.likes = node.like_count;
    if (typeof info?.direct_reply_count === "number") {
      metrics.replies = info.direct_reply_count;
    } else if (typeof node.comment_count === "number") {
      metrics.replies = node.comment_count;
    }
    if (typeof info?.repost_count === "number") {
      metrics.retweets = info.repost_count;
    }
    if (typeof info?.quote_count === "number") {
      metrics.quotes = info.quote_count;
    }
    if (Object.keys(metrics).length > 0) meta.metrics = metrics;

    const caption = node.caption;
    const text = captionText(caption);
    if (text) applyCaption(out, text);

    const media = collectNodeMedia(node);
    if (media.length > 0) {
      out.mediaUrls = media;
      out.mediaUrl = (media[0] as Record<string, unknown>).url;
      out.mediaType = (media[0] as Record<string, unknown>).type ?? "image";
      meta.media = media;
    }

    const infoRec = info as Record<string, unknown> | undefined;
    const quoted = quotedFromShare(infoRec, code);
    if (quoted) meta.quotedTweet = quoted;
    const card = cardFromPreview(infoRec);
    if (card) meta.card = card;
    if (info?.is_reply === true) {
      meta.isReply = true;
      const replyHandle = str(info.reply_to_author?.username);
      if (replyHandle) meta.replyingTo = replyHandle;
    }

    if (Object.keys(meta).length > 0) out.meta = meta;
    return out;
  }

  function extractPostCode(rawUrl: string): string | null {
    try {
      const u = new URL(rawUrl, location.origin);
      return (
        u.pathname.match(/\/post\/([A-Za-z0-9_-]+)/)?.[1] ??
        u.pathname.match(/\/t\/([A-Za-z0-9_-]+)/)?.[1] ??
        null
      );
    } catch {
      return null;
    }
  }

  return {
    shortcodeToPk,
    pickLargestSrcset,
    looksLikeAvatar,
    isBrandAsset,
    applyCaption,
    titleFromText,
    normalizeMediaNode,
    extractPostCode,
  };
}
