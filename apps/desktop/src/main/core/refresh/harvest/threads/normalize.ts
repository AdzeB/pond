/// <reference lib="dom" />

export function inPageThreadsNormalize() {
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

    const rawTitle = getMeta([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ]);
    // og:title is usually "<name> (@handle) on Threads"; keep the body text as
    // the description and derive a short title from the first line.
    const desc = getMeta([
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]);
    if (desc) {
      out.description = desc.length > 4000 ? `${desc.slice(0, 4000)}…` : desc;
      const firstLine = desc.split(/\n+/)[0]?.trim() ?? desc;
      out.title =
        firstLine.length <= 90 ? firstLine : `${firstLine.slice(0, 89)}…`;
    } else if (rawTitle) {
      out.title = rawTitle;
    }

    const nameMatch = rawTitle?.match(/^(.*?)\s*\(@([^)]+)\)/);
    const parsedName = nameMatch?.[1]?.trim();
    const parsedHandle = nameMatch?.[2]?.trim();
    if (parsedHandle) {
      if (parsedName) meta.authorName = parsedName;
      out.author = parsedHandle;
    } else {
      const handle = location.pathname.match(/\/@([^/]+)\//)?.[1];
      if (handle) out.author = handle;
    }

    const ogImage = getMeta([
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
    ]);
    const ogVideo = getMeta([
      'meta[property="og:video"]',
      'meta[property="og:video:url"]',
      'meta[property="og:video:secure_url"]',
    ]);
    if (ogVideo) {
      out.mediaUrl = ogImage || ogVideo;
      out.mediaUrls = [
        {
          url: ogVideo,
          type: "video",
          ...(ogImage ? { poster: ogImage } : {}),
        },
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

  return { extractPostMeta };
}
