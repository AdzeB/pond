/// <reference lib="dom" />

export function inPageRedditNormalize() {
  const getMeta = (selectors: readonly string[]): string | undefined => {
    for (const sel of selectors) {
      const el = document.querySelector<HTMLMetaElement>(sel);
      const value = el?.content?.trim();
      if (value) return value;
    }
    return undefined;
  };

  function extractPostMeta(): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    const meta: Record<string, unknown> = {};

    /** shreddit renders the post as a custom element carrying structured attrs. */
    const post = document.querySelector("shreddit-post");

    const title =
      post?.getAttribute("post-title")?.trim() ||
      document.querySelector<HTMLElement>("h1")?.textContent?.trim() ||
      getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]']);
    if (title) {
      const cleaned = title.replace(/\s+:\s+r\/[A-Za-z0-9_]+\s*$/i, "").trim();
      out.title = cleaned || title;
    }

    const desc = getMeta([
      'meta[property="og:description"]',
      'meta[name="description"]',
    ]);
    if (desc) {
      out.description = desc.length > 4000 ? `${desc.slice(0, 4000)}…` : desc;
    }

    const authorAttr = post?.getAttribute("author")?.trim();
    const authorLink = document.querySelector<HTMLAnchorElement>(
      'a[href^="/user/"], a[href^="/u/"]',
    );
    const author =
      authorAttr ||
      authorLink?.textContent?.trim().replace(/^u\//, "") ||
      undefined;
    if (author) {
      out.author = author;
      meta.authorName = author;
      meta.authorUrl = `https://www.reddit.com/user/${author.replace(/^u\//, "")}`;
    }

    const subreddit =
      post?.getAttribute("subreddit-prefixed-name")?.trim() ||
      (() => {
        const m = location.pathname.match(/\/r\/([A-Za-z0-9_]+)/);
        return m ? `r/${m[1]}` : undefined;
      })();
    if (subreddit) meta.subreddit = subreddit;

    const created = post?.getAttribute("created-timestamp")?.trim();
    if (created) meta.publishedAt = created;

    const metrics: Record<string, number> = {};
    const score = post?.getAttribute("score");
    if (score && Number.isFinite(Number(score))) metrics.likes = Number(score);
    const comments = post?.getAttribute("comment-count");
    if (comments && Number.isFinite(Number(comments))) {
      metrics.comments = Number(comments);
    }
    if (Object.keys(metrics).length > 0) meta.metrics = metrics;

    const video = document.querySelector<HTMLVideoElement>(
      "shreddit-player, video",
    );
    const ogVideo = getMeta([
      'meta[property="og:video"]',
      'meta[property="og:video:url"]',
      'meta[property="og:video:secure_url"]',
    ]);
    const ogImage = getMeta([
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
    ]);

    const videoSrc =
      (video instanceof HTMLVideoElement
        ? video.src || video.querySelector("source")?.src
        : undefined) || ogVideo;
    if (videoSrc) {
      const poster =
        (video instanceof HTMLVideoElement ? video.poster : "") ||
        ogImage ||
        undefined;
      out.mediaUrl = poster || videoSrc;
      out.mediaUrls = [
        { url: videoSrc, type: "video", ...(poster ? { poster } : {}) },
      ];
      out.mediaType = "video";
    } else if (ogImage) {
      out.mediaUrl = ogImage;
      out.mediaUrls = [{ url: ogImage, type: "image" }];
      out.mediaType = "image";
    }

    const lang = document.documentElement.lang?.trim();
    if (lang) {
      out.lang = lang;
      meta.lang = lang;
    }

    if (Object.keys(meta).length > 0) out.meta = meta;
    if (!out.title && !out.description && !out.mediaUrl) return null;
    return out;
  }

  function extractPostId(rawUrl: string): string | null {
    try {
      const u = new URL(rawUrl, location.origin);
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

  return { extractPostMeta, extractPostId };
}
