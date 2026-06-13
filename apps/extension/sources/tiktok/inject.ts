import {
  capture,
  installInterceptor,
  type RequestLens,
} from "@/utils/intercept";

const FAVORITE_RE = /\/api\/aweme\/favorite\/?/i;
const FEED_RE = /\/api\/(aweme|item|feed|post)/i;

function readJson(text: string | null): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function awemeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url, location.href);
    return (
      u.searchParams.get("aweme_id") ??
      u.searchParams.get("awemeId") ??
      u.searchParams.get("item_id") ??
      null
    );
  } catch {
    return null;
  }
}

function isFavoriteType(url: string): boolean {
  try {
    const t = new URL(url, location.href).searchParams.get("type");
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
        const id = awemeIdFromUrl(req.url);
        if (id) emitFavorite(id);
        return;
      }
      if (req.method === "GET" && FEED_RE.test(req.url)) {
        walkForAweme(readJson(await res.readText()));
      }
    },
  });
}
