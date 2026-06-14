/// <reference lib="dom" />

export function inPageCosmosNormalize() {
  function extractElementId(href: string): string | null {
    try {
      const u = new URL(href, location.origin);
      return u.pathname.match(/\/e\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
    } catch {
      return null;
    }
  }

  function extractElementPageMeta(): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    const meta: Record<string, unknown> = {};

    const titleEl = document.querySelector<HTMLElement>(
      "[class*='title' i], [class*='Title'], h1, h2",
    );
    const title = titleEl?.textContent?.trim();
    if (title) out.title = title;

    const descEl = document.querySelector<HTMLElement>(
      "[class*='description' i], [class*='Description'], [class*='caption' i]",
    );
    const desc = descEl?.textContent?.trim();
    if (desc) {
      out.description = desc.length > 4000 ? `${desc.slice(0, 4000)}…` : desc;
    }

    const authorEl = document.querySelector<HTMLElement>(
      "[class*='author' i], [class*='Author'], [class*='user' i] a",
    );
    if (authorEl?.textContent?.trim()) {
      out.author = authorEl.textContent.trim();
      const link = authorEl.closest("a") ?? authorEl.querySelector("a");
      if (link) {
        const href = link.getAttribute("href");
        if (href) {
          meta.authorUrl = href.startsWith("http")
            ? href
            : `https://www.cosmos.so${href}`;
        }
      }
    }

    const avatarImg = document.querySelector<HTMLImageElement>(
      "[class*='avatar' i] img, [class*='Avatar'] img",
    );
    if (avatarImg?.src) meta.authorAvatar = avatarImg.src;

    // The server-rendered `og:image` is the only reliable per-element image:
    // the DOM is full of sidebar collection covers and `/_next/static/...`
    // skeleton placeholders that load before (or instead of) the real element.
    const ogImage = document.querySelector<HTMLMetaElement>(
      'meta[property="og:image"]',
    );
    const ogImageUrl = ogImage?.content?.trim();
    if (ogImageUrl && !ogImageUrl.startsWith("data:")) {
      out.mediaUrl = ogImageUrl;
      out.mediaUrls = [{ url: ogImageUrl, type: "image" }];
      out.mediaType = "image";
    }

    const video = document.querySelector<HTMLVideoElement>("video");
    if (video?.src) {
      const poster = video.poster || ogImageUrl || (out.mediaUrl as string);
      out.mediaUrl = poster || video.src;
      out.mediaUrls = [
        {
          url: video.src,
          type: "video",
          ...(poster ? { poster } : {}),
        },
      ];
      out.mediaType = "video";
    }

    const ogTitle = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]',
    );
    if (!out.title && ogTitle?.content) out.title = ogTitle.content.trim();

    const lang = document.documentElement.lang?.trim();
    if (lang) {
      out.lang = lang;
      meta.lang = lang;
    }

    if (Object.keys(meta).length > 0) out.meta = meta;
    if (!out.title && !out.description && !out.mediaUrl) return null;
    return out;
  }

  return { extractElementId, extractElementPageMeta };
}
