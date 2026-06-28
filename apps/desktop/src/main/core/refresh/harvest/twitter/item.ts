/// <reference lib="dom" />

import type { ScrapedHarvest } from "../types";
import { inPageTwitterNormalize } from "./normalize";

function harvestSource(): string {
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

    // Fall back to any <time datetime>; newer X renders it outside User-Name.
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

    // No stable testid for quote count; parse the "Quotes" link aria-label/text.
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
    for (const v of videos) {
      if (v.poster) {
        push({ url: v.poster, type: "video", poster: v.poster });
        const dur = norm.readDuration(v);
        const w = v.videoWidth;
        const h = v.videoHeight;
        mediaItems.push({
          url: v.poster,
          type: "video",
          poster: v.poster,
          ...(dur ? { durationSec: dur } : {}),
          ...(w ? { width: w } : {}),
          ...(h ? { height: h } : {}),
        });
        capturedVideoPoster = true;
      }
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
        const src = best ?? img.currentSrc ?? img.src;
        if (src) {
          const upgraded = norm.upgradeTwimgUrl(src);
          push({ url: upgraded, type: "video", poster: upgraded });
          mediaItems.push({
            url: upgraded,
            type: "video",
            poster: upgraded,
          });
          capturedVideoPoster = true;
        }
      }
    }

    const photoImgs = Array.from(
      article.querySelectorAll<HTMLImageElement>(
        '[data-testid="tweetPhoto"] img',
      ),
    ).filter(notInNested);
    for (const img of photoImgs) {
      const best = img.srcset ? norm.pickLargestSrcset(img.srcset) : undefined;
      const src = best ?? img.currentSrc ?? img.src;
      if (src) {
        const upgraded = norm.upgradeTwimgUrl(src);
        push({ url: upgraded, type: "image" });
        const item: Record<string, unknown> = {
          url: upgraded,
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
    }

    // Second pass over the nested quote <article> to append its media after the
    // parent's. Quoted media is also recorded separately on `quoted.media` so
    // the native card can render it inside the nested quote card.
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
        if (!v.poster) continue;
        const dur = norm.readDuration(v);
        const w = v.videoWidth;
        const h = v.videoHeight;
        pushQuoted({
          url: v.poster,
          type: "video",
          poster: v.poster,
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
          const src = best ?? img.currentSrc ?? img.src;
          if (!src) continue;
          const upgraded = norm.upgradeTwimgUrl(src);
          pushQuoted({ url: upgraded, type: "video", poster: upgraded });
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
        const src = best ?? img.currentSrc ?? img.src;
        if (!src) continue;
        const upgraded = norm.upgradeTwimgUrl(src);
        const item: Record<string, unknown> = { url: upgraded, type: "image" };
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
      // Skip X's default SSR og:image; it would mark every text tweet as having media.
      const isSsrDefault =
        typeof ogSrc === "string" &&
        /^https?:\/\/abs\.twimg\.com\/rweb\/ssr\/default\//i.test(ogSrc);
      // Skip avatars: X serves the author's profile image as og:image for
      // text/video tweets, which would render as a bogus (and 404-ing) tile.
      const isAvatar =
        typeof ogSrc === "string" && /\/profile_images\//i.test(ogSrc);
      if (ogSrc && !isSsrDefault && !isAvatar) {
        const upgraded = norm.upgradeTwimgUrl(ogSrc);
        const type = videos.length > 0 ? "video" : "image";
        const entry =
          type === "video"
            ? { url: upgraded, type, poster: upgraded }
            : { url: upgraded, type };
        push(entry);
        mediaItems.push(entry);
      }
    }

    if (media.length > 0) {
      out.mediaUrls = media;
      out.mediaUrl = (media[0] as Record<string, unknown>).url;
      out.mediaType = (media[0] as Record<string, unknown>).type ?? "image";
    }

    if (mediaItems.length > 0) meta.media = mediaItems;

    // Link card (summary / summary_large_image): X renders the linked page's OG
    // preview as [data-testid="card.wrapper"]. Capture the parts we render so the
    // native card shows the embed instead of a bare t.co URL. Scoped via
    // notInNested so a quoted tweet's own card isn't picked up here.
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

      // Card image: X renders it as an <img> in some layouts and as a CSS
      // background on a div in others. Look only inside the media block, and
      // keep the URL as-is — card_img thumbnails don't support the ?name=orig
      // upgrade that tweet photos use, so forcing it would 404 the image.
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

      // The detail column stacks domain, title, description as separate spans.
      // Read each span's own (non-nested) text to avoid parent rows that
      // concatenate every line, then map by X's fixed ordering.
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
      // Twitter lazy-loads each image in a multi-image grid/carousel, so the
      // first <img> can appear well before the rest. Bailing on the first
      // match would capture only one image. Instead, wait until the media
      // element count stops growing (stable for a short window) or we time out.
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
