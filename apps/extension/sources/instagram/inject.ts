import {
  capture,
  installInterceptor,
  log,
  type RequestLens,
} from "@/utils/intercept";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

declare global {
  interface Window {
    __pondInstagramInjected?: boolean;
  }
}

function looksLikeSaveLabel(label: string | null): boolean {
  if (!label) return false;
  const l = label.toLowerCase().trim();
  return (
    l === "save" ||
    l === "bookmark" ||
    l.includes("save to collection") ||
    l.includes("add to collection")
  );
}

function shortcodeFromHref(href: string | null): string | null {
  if (!href) return null;
  const m = String(href).match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function kindFromHref(href: string | null): string {
  if (!href) return "p";
  if (href.includes("/reel/")) return "reel";
  if (href.includes("/tv/")) return "tv";
  return "p";
}

function findShortcodeAroundClick(
  target: EventTarget | null,
): { shortcode: string; kind: string } | null {
  if (!(target instanceof Element)) return null;
  let cur: Element | null = target;
  let depth = 0;
  while (cur && depth < 30) {
    const link = cur.querySelector(
      'a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]',
    );
    const href = link?.getAttribute("href") ?? null;
    const sc = shortcodeFromHref(href);
    if (sc) return { shortcode: sc, kind: kindFromHref(href) };
    cur = cur.parentElement;
    depth++;
  }
  const path = location.pathname;
  const sc = shortcodeFromHref(path);
  if (sc) return { shortcode: sc, kind: kindFromHref(path) };
  return null;
}

function findSaveElementFromTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  let cur: Element | null = target;
  let depth = 0;
  while (cur && depth < 8) {
    const lbl = cur.getAttribute?.("aria-label");
    if (lbl && looksLikeSaveLabel(lbl)) return cur;
    cur = cur.parentElement;
    depth++;
  }
  const button = target.closest?.(
    'button, [role="button"], a[role="button"], div[role="button"]',
  );
  if (button) {
    const inner = button.querySelector?.("svg[aria-label]");
    if (inner) {
      const lbl = inner.getAttribute("aria-label");
      if (lbl && looksLikeSaveLabel(lbl)) return inner;
    }
  }
  return null;
}

function mediaIdToShortcode(id: string): string | null {
  try {
    let n = BigInt(String(id).split("_")[0]);
    let s = "";
    while (n > 0n) {
      s = ALPHABET[Number(n & 63n)] + s;
      n = n >> 6n;
    }
    return s || null;
  } catch {
    return null;
  }
}

function isSaveMutation(
  getHeader: (name: string) => string | null,
  bodyStr: string | null,
): boolean {
  const friendly = getHeader("x-fb-friendly-name");
  if (friendly === "usePolarisSaveMediaSaveMutation") return true;
  const root = getHeader("x-root-field-name");
  if (root && /__save$/.test(root) && !/unsave/i.test(root)) return true;
  if (bodyStr) {
    if (bodyStr.includes("usePolarisSaveMediaSaveMutation")) return true;
    if (
      /xdt_api__v1__web__save__media_id__save(?!_unsave)/.test(bodyStr) &&
      !/unsave/i.test(bodyStr)
    ) {
      return true;
    }
  }
  return false;
}

function extractMediaIdFromBody(bodyStr: string | null): string | null {
  if (!bodyStr) return null;
  try {
    const params = new URLSearchParams(bodyStr);
    const variablesRaw = params.get("variables");
    if (!variablesRaw) return null;
    const vars = JSON.parse(variablesRaw);
    const candidate = vars.media_id ?? vars.mediaId ?? vars.media?.id ?? null;
    return candidate == null ? null : String(candidate);
  } catch {
    return null;
  }
}

function isGraphqlUrl(url: string): boolean {
  return /\/graphql\/query\b/.test(url);
}

export function inject(): void {
  if (window.__pondInstagramInjected) return;
  window.__pondInstagramInjected = true;

  document.addEventListener(
    "click",
    (ev) => {
      try {
        if (!findSaveElementFromTarget(ev.target)) return;
        const ctx = findShortcodeAroundClick(ev.target);
        if (!ctx) return;
        capture(
          `https://www.instagram.com/${ctx.kind}/${ctx.shortcode}/`,
          "instagram:save",
        );
      } catch (e) {
        log("warn", "instagram dom-click hook error", String(e));
      }
    },
    true,
  );

  installInterceptor({
    id: "instagram",
    match: (req: RequestLens) => req.method === "POST" && isGraphqlUrl(req.url),
    async onResponse(req) {
      const bodyStr = await req.readBody();
      if (!isSaveMutation(req.getHeader, bodyStr)) return;
      const mediaId = extractMediaIdFromBody(bodyStr);
      if (!mediaId) return;
      const shortcode = mediaIdToShortcode(mediaId);
      if (!shortcode) return;
      capture(
        `https://www.instagram.com/p/${shortcode}/`,
        "instagram:graphql-save",
      );
    },
  });
}
