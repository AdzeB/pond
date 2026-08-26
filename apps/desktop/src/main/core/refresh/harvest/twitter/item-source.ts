/// <reference lib="dom" />

import type { inPageTwitterNormalize } from "./normalize";

export function harvestSource(): string {
  function inPage(
    tweetId: string,
    norm: ReturnType<typeof inPageTwitterNormalize>,
  ): unknown {
    const anchor = document.querySelector<HTMLAnchorElement>(
      `a[href*="/status/${tweetId}"]`,
    );
    const article = anchor?.closest("article") ?? null;
    if (!article) return null;

    const out: Record<string, unknown> = {};
    const meta: Record<string, unknown> = {};
    const mediaItems: Array<Record<string, unknown>> = [];

    function notInNested(el: Element): boolean {
      const closest = el.closest("article");
      return closest === article;
    }

    const textEl = Array.from(
      article.querySelectorAll<HTMLElement>('[data-testid="tweetText"]'),
    ).find(notInNested);
    const text = textEl?.textContent?.trim();
    if (text) {
      out.description = text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
      const firstLine = text.split(/\n+/)[0]?.trim() ?? text;
      const titleCap = 90;
      out.title =
        firstLine.length <= titleCap
          ? firstLine
          : `${firstLine.slice(0, titleCap - 1).trimEnd()}…`;
    }

    const langAttr = textEl?.getAttribute("lang")?.trim();
    if (langAttr) {
      out.lang = langAttr;
      meta.lang = langAttr;
    }

    const userName = Array.from(
      article.querySelectorAll<HTMLElement>('[data-testid="User-Name"]'),
    ).find(notInNested);
    if (userName) {
      const handleLink = Array.from(
        userName.querySelectorAll<HTMLAnchorElement>("a[href]"),
      ).find((a) => {
        try {
          const p = new URL(a.href).pathname;
          return /^\/[A-Za-z0-9_]+\/?$/.test(p) && !p.startsWith("/i/");
        } catch {
          return false;
        }
      });
      if (handleLink) {
        const handle = new URL(handleLink.href).pathname.replace(/\//g, "");
        if (handle) {
          out.author = `@${handle}`;
          meta.authorUrl = `https://x.com/${handle}`;
        }
      }

      const nameLink = handleLink;
      if (nameLink) {
        const raw = nameLink.textContent?.replace(/\s+/g, " ").trim();
        if (raw) meta.authorName = raw;
      }

      meta.verified = !!userName.querySelector(
        'svg[data-testid="icon-verified"], svg[aria-label="Verified account"]',
      );

      const time = userName.querySelector<HTMLTimeElement>("time[datetime]");
      const dt = time?.getAttribute("datetime");
      if (dt) meta.publishedAt = dt;
    }

    if (!meta.publishedAt) {
      const time = Array.from(
        article.querySelectorAll<HTMLTimeElement>("time[datetime]"),
      ).find(notInNested);
      const dt = time?.getAttribute("datetime");
      if (dt) meta.publishedAt = dt;
    }

    const avatarImg = article.querySelector<HTMLImageElement>(
      '[data-testid^="UserAvatar-Container"] img',
    );
    const avatarSrc = avatarImg?.currentSrc ?? avatarImg?.src ?? "";
    if (avatarSrc) {
      meta.authorAvatar = avatarSrc.replace(
        /_normal(\.(?:jpg|jpeg|png|webp))/i,
        "_400x400$1",
      );
    }

    const replyingPrefix = Array.from(
      article.querySelectorAll<HTMLElement>("a[href^='/']"),
    ).some((a) => /Replying to/i.test(a.textContent ?? ""));
    meta.isReply = !!(
      replyingPrefix || article.querySelector('[data-testid="reply-context"]')
    );

    const innerArticle = Array.from(
      article.querySelectorAll<HTMLElement>("article"),
    ).find((a) => a !== article);
    if (innerArticle) {
      meta.isQuote = true;
      const quoted: Record<string, unknown> = {};
      const innerLink = Array.from(
        innerArticle.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'),
      )[0];
      const innerTweetId = innerLink
        ? innerLink.href.match(/\/status\/(\d+)/)?.[1]
        : undefined;
      if (innerTweetId && innerLink) {
        quoted.tweetId = innerTweetId;
        quoted.url = `https://x.com${new URL(innerLink.href).pathname}`;
      }
      const innerHandle = Array.from(
        innerArticle.querySelectorAll<HTMLAnchorElement>("a[href]"),
      ).find((a) => {
        try {
          const p = new URL(a.href).pathname;
          return /^\/[A-Za-z0-9_]+\/?$/.test(p) && !p.startsWith("/i/");
        } catch {
          return false;
        }
      });
      if (innerHandle) {
        const h = new URL(innerHandle.href).pathname.replace(/\//g, "");
        if (h) {
          quoted.author = `@${h}`;
          const innerName = innerHandle.textContent
            ?.replace(/\s+/g, " ")
            .trim();
          if (innerName) quoted.authorName = innerName;
        }
      }
      const innerAvatar = innerArticle.querySelector<HTMLImageElement>(
        '[data-testid^="UserAvatar-Container"] img',
      );
      const innerAvatarSrc = innerAvatar?.currentSrc ?? innerAvatar?.src ?? "";
      if (innerAvatarSrc) {
        quoted.authorAvatar = innerAvatarSrc.replace(
          /_normal(\.(?:jpg|jpeg|png|webp))/i,
          "_400x400$1",
        );
      }
      const innerText = innerArticle.querySelector<HTMLElement>(
        '[data-testid="tweetText"]',
      );
      const innerBody = innerText?.textContent?.trim();
      if (innerBody) {
        quoted.text =
          innerBody.length > 600 ? `${innerBody.slice(0, 600)}…` : innerBody;
      }
      meta.quotedTweet = quoted;
    } else {
      meta.isQuote = false;
    }

    meta.isThreadRoot = !!article.querySelector(
      'a[href*="/with_replies"], div[data-testid="reply"]',
    );
    if (!meta.isReply) {
      meta.conversationId = tweetId;
    }

    const metrics: Record<string, unknown> = {};
    const reply = norm.metricFromTestid(article, "reply");
    if (reply !== undefined) metrics.replies = reply;
    const rt = norm.metricFromTestid(article, "retweet");
    if (rt !== undefined) metrics.retweets = rt;
    const like = norm.metricFromTestid(article, "like");
    if (like !== undefined) metrics.likes = like;
    const views = norm.metricFromTestid(article, "viewCount");
    if (views !== undefined) metrics.views = views;
    let bookmarks = norm.metricFromTestid(article, "bookmark");
    if (bookmarks === undefined) {
      const candidates = Array.from(
        article.querySelectorAll<HTMLElement>("[aria-label]"),
      ).filter(notInNested);
      for (const el of candidates) {
        const lbl = el.getAttribute("aria-label") ?? "";
        if (!/bookmark/i.test(lbl)) continue;
        const match = lbl.match(/([\d.,]+\s*[KMB]?)\s+Bookmark/i);
        if (!match?.[1]) continue;
        const parsed = norm.parseMetric(match[1]);
        if (parsed !== undefined) {
          bookmarks = parsed;
          break;
        }
      }
    }
    if (bookmarks !== undefined) metrics.bookmarks = bookmarks;

    let quotes: number | undefined;
    {
      const quoteCandidates = Array.from(
        article.querySelectorAll<HTMLAnchorElement>(
          'a[href*="/quotes"], a[href*="/retweets/with_comments"]',
        ),
      ).filter(notInNested);
      for (const el of quoteCandidates) {
        const lbl = el.getAttribute("aria-label") ?? el.textContent ?? "";
        const match = lbl.match(/([\d.,]+\s*[KMB]?)\s+Quote/i);
        if (!match?.[1]) continue;
        const parsed = norm.parseMetric(match[1]);
        if (parsed !== undefined) {
          quotes = parsed;
          break;
        }
      }
    }
    if (quotes !== undefined) metrics.quotes = quotes;
    if (Object.keys(metrics).length > 0) meta.metrics = metrics;

    const media: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    const push = (m: Record<string, unknown> | undefined) => {
      const u = m && typeof m.url === "string" ? m.url : undefined;
      if (!u || seen.has(u)) return;
      seen.add(u);
      media.push(m as Record<string, unknown>);
    };

    const videos = Array.from(
      article.querySelectorAll<HTMLVideoElement>("video"),
    ).filter(notInNested);
    let capturedVideoPoster = false;
    let videoDuration: number | undefined;
    let videoWidth: number | undefined;
    let videoHeight: number | undefined;
    for (const v of videos) {
      const dur = norm.readDuration(v);
      if (dur) videoDuration = dur;
      if (v.videoWidth) videoWidth = v.videoWidth;
      if (v.videoHeight) videoHeight = v.videoHeight;
      const poster = norm.httpMediaUrl(v.poster);
      if (!poster) continue;
      push({ url: poster, type: "video", poster });
      mediaItems.push({
        url: poster,
        type: "video",
        poster,
        ...(dur ? { durationSec: dur } : {}),
        ...(v.videoWidth ? { width: v.videoWidth } : {}),
        ...(v.videoHeight ? { height: v.videoHeight } : {}),
      });
      capturedVideoPoster = true;
    }
    if (!capturedVideoPoster) {
      const videoPosterImgs = Array.from(
        article.querySelectorAll<HTMLImageElement>(
          '[data-testid="videoPlayer"] img, [data-testid="videoComponent"] img',
        ),
      ).filter(notInNested);
      for (const img of videoPosterImgs) {
        const best = img.srcset
          ? norm.pickLargestSrcset(img.srcset)
          : undefined;
        const poster = norm.httpMediaUrl(best ?? img.currentSrc ?? img.src);
        if (!poster) continue;
        push({ url: poster, type: "video", poster });
        mediaItems.push({
          url: poster,
          type: "video",
          poster,
          ...(videoDuration ? { durationSec: videoDuration } : {}),
          ...(videoWidth ? { width: videoWidth } : {}),
          ...(videoHeight ? { height: videoHeight } : {}),
        });
        capturedVideoPoster = true;
      }
    }

    const photoImgs = Array.from(
      article.querySelectorAll<HTMLImageElement>(
        '[data-testid="tweetPhoto"] img',
      ),
    ).filter(notInNested);
    for (const img of photoImgs) {
      const best = img.srcset ? norm.pickLargestSrcset(img.srcset) : undefined;
      const src = norm.httpMediaUrl(best ?? img.currentSrc ?? img.src);
      if (!src) continue;
      push({ url: src, type: "image" });
      const item: Record<string, unknown> = {
        url: src,
        type: "image",
      };
      const alt = img.getAttribute("alt")?.trim();
      if (alt) item.altText = alt;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w) item.width = w;
      if (h) item.height = h;
      mediaItems.push(item);
    }

    if (innerArticle) {
      const quotedMedia: Array<Record<string, unknown>> = [];
      const pushQuoted = (m: Record<string, unknown>) => {
        push(m);
        mediaItems.push(m);
        quotedMedia.push(m);
      };
      const quotedVideos = Array.from(
        innerArticle.querySelectorAll<HTMLVideoElement>("video"),
      );
      let capturedQuotedVideo = false;
      for (const v of quotedVideos) {
        const poster = norm.httpMediaUrl(v.poster);
        if (!poster) continue;
        const dur = norm.readDuration(v);
        const w = v.videoWidth;
        const h = v.videoHeight;
        pushQuoted({
          url: poster,
          type: "video",
          poster,
          ...(dur ? { durationSec: dur } : {}),
          ...(w ? { width: w } : {}),
          ...(h ? { height: h } : {}),
        });
        capturedQuotedVideo = true;
      }
      if (!capturedQuotedVideo) {
        const quotedVideoPosters = Array.from(
          innerArticle.querySelectorAll<HTMLImageElement>(
            '[data-testid="videoPlayer"] img, [data-testid="videoComponent"] img',
          ),
        );
        for (const img of quotedVideoPosters) {
          const best = img.srcset
            ? norm.pickLargestSrcset(img.srcset)
            : undefined;
          const poster = norm.httpMediaUrl(best ?? img.currentSrc ?? img.src);
          if (!poster) continue;
          pushQuoted({ url: poster, type: "video", poster });
        }
      }

      const quotedPhotos = Array.from(
        innerArticle.querySelectorAll<HTMLImageElement>(
          '[data-testid="tweetPhoto"] img',
        ),
      );
      for (const img of quotedPhotos) {
        const best = img.srcset
          ? norm.pickLargestSrcset(img.srcset)
          : undefined;
        const src = norm.httpMediaUrl(best ?? img.currentSrc ?? img.src);
        if (!src) continue;
        const item: Record<string, unknown> = { url: src, type: "image" };
        const alt = img.getAttribute("alt")?.trim();
        if (alt) item.altText = alt;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w) item.width = w;
        if (h) item.height = h;
        pushQuoted(item);
      }

      if (quotedMedia.length > 0 && meta.quotedTweet) {
        (meta.quotedTweet as Record<string, unknown>).media = quotedMedia;
      }
    }

    if (media.length === 0) {
      const ogMeta = document.querySelector<HTMLMetaElement>(
        'meta[property="og:image"], meta[name="og:image"]',
      );
      const ogSrc = ogMeta?.content?.trim();
      const isSsrDefault =
        typeof ogSrc === "string" &&
        /^https?:\/\/abs\.twimg\.com\/rweb\/ssr\/default\//i.test(ogSrc);
      const isAvatar =
        typeof ogSrc === "string" && /\/profile_images\//i.test(ogSrc);
      if (ogSrc && !isSsrDefault && !isAvatar) {
        const upgraded = norm.httpMediaUrl(ogSrc);
        if (upgraded) {
          const type = videos.length > 0 ? "video" : "image";
          const entry =
            type === "video"
              ? { url: upgraded, type, poster: upgraded }
              : { url: upgraded, type };
          push(entry);
          mediaItems.push(entry);
        }
      }
    }

    if (media.length > 0) {
      out.mediaUrls = media;
      out.mediaUrl = (media[0] as Record<string, unknown>).url;
      out.mediaType = (media[0] as Record<string, unknown>).type ?? "image";
    }

    if (mediaItems.length > 0) meta.media = mediaItems;

    const cardWrap = Array.from(
      article.querySelectorAll<HTMLElement>('[data-testid="card.wrapper"]'),
    ).find(notInNested);
    if (cardWrap) {
      const card: Record<string, unknown> = {};

      const linkEl = cardWrap.querySelector<HTMLAnchorElement>("a[href]");
      if (linkEl?.href) card.url = linkEl.href;

      card.large = !!cardWrap.querySelector(
        '[data-testid="card.layoutLarge.media"]',
      );

      const mediaBlock =
        cardWrap.querySelector<HTMLElement>('[data-testid$=".media"]') ??
        cardWrap;
      let cardImgSrc =
        mediaBlock.querySelector<HTMLImageElement>("img")?.currentSrc ??
        mediaBlock.querySelector<HTMLImageElement>("img")?.src ??
        "";
      if (!cardImgSrc) {
        const bgEl = Array.from(
          mediaBlock.querySelectorAll<HTMLElement>("*"),
        ).find((el) => {
          const bg = window.getComputedStyle(el).backgroundImage;
          return !!bg && bg !== "none" && bg.includes("url(");
        });
        if (bgEl) {
          const match = window
            .getComputedStyle(bgEl)
            .backgroundImage.match(/url\((['"]?)(.*?)\1\)/);
          if (match?.[2]) cardImgSrc = match[2];
        }
      }
      if (cardImgSrc) card.imageUrl = cardImgSrc;

      /** The detail column stacks domain, title, description as separate spans; read each span's own text to avoid concatenating parent rows, then map by X's fixed ordering. */
      const detail =
        cardWrap.querySelector<HTMLElement>('[data-testid$=".detail"]') ??
        cardWrap;
      const directText = (el: Element): string => {
        let s = "";
        el.childNodes.forEach((n) => {
          if (n.nodeType === 3) s += n.textContent ?? "";
        });
        return s.replace(/\s+/g, " ").trim();
      };
      const rows = Array.from(detail.querySelectorAll<HTMLElement>("span"))
        .map(directText)
        .filter((t) => t.length > 0);
      const unique = rows.filter((t, i) => rows.indexOf(t) === i);
      const [domain, title, description] = unique;
      if (domain) card.domain = domain;
      if (title) card.title = title;
      if (description) card.description = description;

      if (card.url || card.title || card.imageUrl) meta.card = card;
    }

    if (Object.keys(meta).length > 0) out.meta = meta;
    return out;
  }

  return inPage.toString();
}
