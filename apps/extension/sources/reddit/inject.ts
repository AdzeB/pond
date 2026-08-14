import {
  capture,
  installInterceptor,
  log,
  type RequestLens,
} from "@/utils/intercept";

const LEGACY_SAVE_RE = /\/api\/save\b/i;
const GRAPHQL_SAVE_RE = /\/svc\/shreddit\/graphql\b|gql\.reddit\.com/i;
const POST_ID_RE = /t3_([a-z0-9]+)/i;
const COMMENT_ID_RE = /t1_[a-z0-9]+/i;

function composedNodes(ev: Event): EventTarget[] {
  return typeof ev.composedPath === "function" ? ev.composedPath() : [];
}

function compactText(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function looksLikeSaveLabel(label: string | null): boolean {
  if (!label) return false;
  const l = label.toLowerCase().trim();
  if (/unsave|remove/.test(l)) return false;
  return l === "save" || l === "save post";
}

function iconName(el: Element): string | null {
  return (
    el.getAttribute("icon-name") ??
    el.querySelector("svg[icon-name]")?.getAttribute("icon-name") ??
    null
  );
}

function isUnsaveClick(el: Element): boolean {
  const icon = iconName(el);
  if (icon === "save-fill") return true;
  const text = compactText(el.textContent);
  return (
    text === "unsave" || text === "remove from saved" || text === "unsave post"
  );
}

function isSaveClickNode(el: Element): boolean {
  if (el.closest?.(".save-comment-menu-button")) return false;
  if (isUnsaveClick(el)) return false;
  const icon = iconName(el);
  if (icon === "save-outline" || icon === "save") return true;
  if (icon?.includes("save") && !icon.includes("fill")) return true;
  if (looksLikeSaveLabel(el.getAttribute("aria-label"))) return true;
  const text = compactText(el.textContent);
  return text === "save" || text === "save post" || text === "bookmark";
}

function isSaveClick(ev: Event): boolean {
  for (const node of composedNodes(ev)) {
    if (!(node instanceof Element)) continue;
    if (isUnsaveClick(node) && compactText(node.textContent).length < 32) {
      return false;
    }
    if (isSaveClickNode(node) && compactText(node.textContent).length < 32) {
      return true;
    }
  }
  if (!(ev.target instanceof Element)) return false;
  let cur: Element | null = ev.target;
  let depth = 0;
  while (cur && depth < 12) {
    if (isUnsaveClick(cur) && compactText(cur.textContent).length < 32) {
      return false;
    }
    if (isSaveClickNode(cur) && compactText(cur.textContent).length < 32) {
      return true;
    }
    cur = cur.parentElement;
    depth++;
  }
  return false;
}

function permalinkFromPost(post: Element): string | null {
  const permalink =
    post.getAttribute("permalink") ?? post.getAttribute("content-href");
  if (permalink?.includes("/comments/")) {
    return permalink.startsWith("http")
      ? permalink
      : `https://www.reddit.com${permalink}`;
  }
  const idAttr =
    post.getAttribute("id") ??
    post.getAttribute("post-id") ??
    post.getAttribute("content-id") ??
    "";
  const m = idAttr.match(POST_ID_RE);
  return m ? `https://redd.it/${m[1]}` : null;
}

function permalinkFromPath(path: EventTarget[]): string | null {
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    if (node.localName === "shreddit-post") {
      const url = permalinkFromPost(node);
      if (url) return url;
    }
    const fullname = node.getAttribute("data-fullname");
    if (fullname?.startsWith("t3_")) return fullnameToUrl(fullname);
    if (node instanceof HTMLAnchorElement && node.href.includes("/comments/")) {
      return node.href;
    }
  }
  return null;
}

function permalinkFromLocation(): string | null {
  const m = location.pathname.match(/\/comments\/([a-z0-9]+)/i);
  return m ? `https://redd.it/${m[1]}` : null;
}

function fullnameToUrl(id: string | null): string | null {
  const m = id ? id.match(/^t3_([a-z0-9]+)$/i) : null;
  return m ? `https://redd.it/${m[1]}` : null;
}

function readLegacyFullname(url: string, body: string | null): string | null {
  try {
    const fromQuery = new URL(url, location.href).searchParams.get("id");
    if (fromQuery) return fromQuery;
  } catch {
    return bodyFullname(body);
  }
  return bodyFullname(body);
}

function bodyFullname(body: string | null): string | null {
  if (!body) return null;
  try {
    const v = new URLSearchParams(body).get("id");
    if (v) return v;
  } catch {
    return regexFullname(body);
  }
  return regexFullname(body);
}

function regexFullname(body: string): string | null {
  const m = body.match(/"?id"?\s*[:=]\s*"?(t3_[a-z0-9]+)"?/i);
  return m?.[1] ?? null;
}

function parseJson(body: string | null): Record<string, unknown> | null {
  if (!body) return null;
  try {
    const json = JSON.parse(body) as unknown;
    return json && typeof json === "object"
      ? (json as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function operationName(
  json: Record<string, unknown> | null,
  body: string,
): string {
  if (json) {
    const op = json.operation ?? json.operationName;
    if (typeof op === "string") return op;
  }
  return /"operation(?:Name)?"\s*:\s*"([^"]+)"/.exec(body)?.[1] ?? "";
}

function graphqlInput(
  json: Record<string, unknown> | null,
): Record<string, unknown> {
  const vars = asRecord(json?.variables) ?? {};
  return asRecord(vars.input) ?? vars;
}

function isGraphqlSave(body: string | null): boolean {
  if (!body || !/save/i.test(body)) return false;
  if (COMMENT_ID_RE.test(body) && !POST_ID_RE.test(body)) return false;
  const json = parseJson(body);
  const op = operationName(json, body);
  if (/comment/i.test(op) && /save/i.test(op)) return false;
  if (/unsave/i.test(op)) return false;
  const input = graphqlInput(json);
  if (input.saved === false || input.save === false) return false;
  const action = String(input.action ?? "").toLowerCase();
  if (action === "unsave") return false;
  if (/postsave|savepost|save.?state/i.test(op)) return true;
  if (/updatePostSaveState/i.test(body) && !/unsave/i.test(body)) return true;
  return action === "save" || input.saved === true || input.save === true;
}

function postIdFromGraphql(body: string | null): string | null {
  if (!body) return null;
  const json = parseJson(body);
  const input = graphqlInput(json);
  for (const key of ["postId", "post_id", "id", "thingId", "thing_id"]) {
    const v = input[key];
    if (typeof v === "string") {
      const m = v.match(POST_ID_RE);
      if (m) return m[1];
    }
  }
  const m = body.match(POST_ID_RE);
  return m?.[1] ?? null;
}

export function inject(): void {
  if ((window as any).__pondRedditInjected) return;
  (window as any).__pondRedditInjected = true;

  const recent = new Map<string, number>();

  function emit(url: string, trigger: string): void {
    const now = Date.now();
    const prev = recent.get(url);
    if (prev && now - prev < 4000) return;
    recent.set(url, now);
    capture(url, trigger);
  }

  /** Overflow Save is inside a shadow menu; keep the permalink from the last in-post click. */
  let pendingPermalink: string | null = null;

  document.addEventListener(
    "click",
    (ev) => {
      try {
        const nearby = permalinkFromPath(composedNodes(ev));
        if (nearby) pendingPermalink = nearby;
        if (!isSaveClick(ev)) return;
        const url = nearby ?? pendingPermalink ?? permalinkFromLocation();
        if (url) emit(url, "reddit:save");
      } catch (e) {
        log("warn", "reddit dom-click hook error", String(e));
      }
    },
    true,
  );

  installInterceptor({
    id: "reddit",
    match: (req: RequestLens) =>
      req.method === "POST" &&
      (LEGACY_SAVE_RE.test(req.url) || GRAPHQL_SAVE_RE.test(req.url)),
    async onResponse(req, res) {
      if (!res.ok) return;
      const body = await req.readBody();
      if (LEGACY_SAVE_RE.test(req.url)) {
        const url = fullnameToUrl(readLegacyFullname(req.url, body));
        if (url) emit(url, "reddit:save");
        return;
      }
      if (!isGraphqlSave(body)) return;
      const id = postIdFromGraphql(body);
      const url = id ? `https://redd.it/${id}` : pendingPermalink;
      if (url) emit(url, "reddit:graphql-save");
    },
  });
}
