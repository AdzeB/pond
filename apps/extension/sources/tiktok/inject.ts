import {
  capture,
  installInterceptor,
  type RequestLens,
} from "@/utils/intercept";

// The bookmark icon on TikTok is "Add to Favorites" (collect). Match the
// favorite/collect verb at the end of any /api/ path so we keep working when
// TikTok reshuffles the prefix (e.g. /api/aweme/favorite/, /api/item/collect/,
// /api/commit/item/collect/). Likes ("digg") are intentionally excluded.
const FAVORITE_RE = /\/api\/(?:[a-z_]+\/)*(?:favorite|collect)\/?(?:\?|$)/i;
const FEED_RE = /\/api\/(aweme|item|feed|post)/i;

function readJson(text: string | null): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const ID_KEYS = ["aweme_id", "awemeId", "item_id", "itemId"] as const;

function awemeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url, location.href);
    for (const key of ID_KEYS) {
      const v = u.searchParams.get(key);
      if (v) return v;
    }
    return null;
  } catch {
    return null;
  }
}

// Newer endpoints send the id in the POST body rather than the query string.
async function awemeIdFromBody(req: RequestLens): Promise<string | null> {
  let body: string | null;
  try {
    body = await req.readBody();
  } catch {
    return null;
  }
  if (!body) return null;
  try {
    const params = new URLSearchParams(body);
    for (const key of ID_KEYS) {
      const v = params.get(key);
      if (v) return v;
    }
  } catch {
    /* not form-encoded */
  }
  const json = readJson(body);
  if (json && typeof json === "object") {
    for (const key of ID_KEYS) {
      const v = (json as Record<string, unknown>)[key];
      if (typeof v === "string" && v) return v;
      if (typeof v === "number") return String(v);
    }
  }
  return null;
}

function isFavoriteType(url: string): boolean {
  try {
    const t = new URL(url, location.href).searchParams.get("type");
    // type=1 adds, type=0 removes; absent on endpoints that don't use it.
    return t === "1" || t === null;
  } catch {
    return true;
  }
}

export function inject(): void {
  const usernameByAwemeId = new Map<string, string>();
  const emitted = new Set<string>();

  function walkForAweme(obj: any): void {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const x of obj) walkForAweme(x);
      return;
    }
    const id = obj.aweme_id ?? obj.awemeId ?? obj.id;
    if (id && obj.author) {
      const username =
        obj.author.unique_id ??
        obj.author.uniqueId ??
        obj.author.handle ??
        null;
      if (typeof username === "string" && username.length > 0) {
        usernameByAwemeId.set(String(id), username);
      }
    }
    for (const k of Object.keys(obj)) {
      try {
        walkForAweme(obj[k]);
      } catch {
        /* ignore */
      }
    }
  }

  function emitFavorite(id: string): void {
    if (!id || emitted.has(id)) return;
    emitted.add(id);
    const username = usernameByAwemeId.get(id);
    const url = username
      ? `https://www.tiktok.com/@${username}/video/${id}`
      : `https://www.tiktok.com/video/${id}`;
    capture(url, "tiktok:favorite");
  }

  installInterceptor({
    id: "tiktok",
    match: (req: RequestLens) =>
      FAVORITE_RE.test(req.url) || FEED_RE.test(req.url),
    async onResponse(req, res) {
      if (!res.ok) return;
      if (FAVORITE_RE.test(req.url) && isFavoriteType(req.url)) {
        const id = awemeIdFromUrl(req.url) ?? (await awemeIdFromBody(req));
        if (id) emitFavorite(id);
        return;
      }
      if (req.method === "GET" && FEED_RE.test(req.url)) {
        walkForAweme(readJson(await res.readText()));
      }
    },
  });
}
