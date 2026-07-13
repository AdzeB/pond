import {
  capture,
  installInterceptor,
  log,
  type RequestLens,
} from "@/utils/intercept";

/** Reddit's "save" posts to /api/save with the post fullname; /api/unsave never matches, so unsaves are ignored. */
const SAVE_RE = /\/api\/save\b/i;

/** t3_ = link/post, t1_ = comment; only posts map to a saveable item URL. */
function fullnameToUrl(id: string | null): string | null {
  const m = id ? id.match(/^t3_([a-z0-9]+)$/i) : null;
  return m ? `https://redd.it/${m[1]}` : null;
}

function readFullname(url: string, body: string | null): string | null {
  try {
    const fromQuery = new URL(url, location.href).searchParams.get("id");
    if (fromQuery) return fromQuery;
  } catch {
    /* relative or malformed url */
  }
  if (body) {
    try {
      const v = new URLSearchParams(body).get("id");
      if (v) return v;
    } catch {
      /* not form-encoded */
    }
    const m = body.match(/"?id"?\s*[:=]\s*"?(t3_[a-z0-9]+)"?/i);
    if (m) return m[1];
  }
  return null;
}

function looksLikeSaveLabel(label: string | null): boolean {
  if (!label) return false;
  const l = label.toLowerCase().trim();
  return l === "save" || l === "save post";
}

function permalinkAround(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  let cur: Element | null = target;
  let depth = 0;
  while (cur && depth < 30) {
    const post = cur.querySelector("shreddit-post[permalink]");
    const permalink = post?.getAttribute("permalink");
    if (permalink?.includes("/comments/")) {
      return `https://www.reddit.com${permalink}`;
    }
    const link = cur.querySelector<HTMLAnchorElement>('a[href*="/comments/"]');
    const href = link?.getAttribute("href");
    if (href) {
      return href.startsWith("http") ? href : `https://www.reddit.com${href}`;
    }
    cur = cur.parentElement;
    depth++;
  }
  const m = location.pathname.match(/\/comments\/[a-z0-9]+/i);
  return m ? `https://www.reddit.com${m[0]}` : null;
}

function findSaveLabel(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  let cur: Element | null = target;
  let depth = 0;
  while (cur && depth < 8) {
    if (looksLikeSaveLabel(cur.getAttribute?.("aria-label"))) return true;
    cur = cur.parentElement;
    depth++;
  }
  return false;
}

export function inject(): void {
  document.addEventListener(
    "click",
    (ev) => {
      try {
        if (!findSaveLabel(ev.target)) return;
        const url = permalinkAround(ev.target);
        if (url) capture(url, "reddit:save");
      } catch (e) {
        log("warn", "reddit dom-click hook error", String(e));
      }
    },
    true,
  );

  installInterceptor({
    id: "reddit",
    match: (req: RequestLens) => req.method === "POST" && SAVE_RE.test(req.url),
    async onResponse(req, res) {
      if (!res.ok) return;
      const url = fullnameToUrl(readFullname(req.url, await req.readBody()));
      if (url) capture(url, "reddit:save");
    },
  });
}
