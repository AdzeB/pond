import { capture, log } from "@/utils/intercept";

// Threads renders a real /@user/post/<code> link on every post, so reading it
// off the DOM when the Save control is clicked is more robust than mapping the
// internal GraphQL save mutation's media id back to a shortcode.
function looksLikeSaveLabel(label: string | null): boolean {
  if (!label) return false;
  const l = label.toLowerCase().trim();
  return l === "save" || l === "bookmark" || l.includes("save");
}

function findSaveElementFromTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  let cur: Element | null = target;
  let depth = 0;
  while (cur && depth < 8) {
    if (looksLikeSaveLabel(cur.getAttribute?.("aria-label"))) return true;
    const svg = cur.querySelector?.("svg[aria-label]");
    if (svg && looksLikeSaveLabel(svg.getAttribute("aria-label"))) return true;
    cur = cur.parentElement;
    depth++;
  }
  return false;
}

function postUrlAround(target: EventTarget | null): string | null {
  const toAbsolute = (href: string): string =>
    href.startsWith("http") ? href : `https://www.threads.com${href}`;

  if (target instanceof Element) {
    let cur: Element | null = target;
    let depth = 0;
    while (cur && depth < 30) {
      const link = cur.querySelector<HTMLAnchorElement>('a[href*="/post/"]');
      const href = link?.getAttribute("href");
      if (href?.includes("/post/")) return toAbsolute(href);
      cur = cur.parentElement;
      depth++;
    }
  }
  const m = location.pathname.match(/\/@[^/]+\/post\/[A-Za-z0-9_-]+/);
  return m ? `https://www.threads.com${m[0]}` : null;
}

export function inject(): void {
  document.addEventListener(
    "click",
    (ev) => {
      try {
        if (!findSaveElementFromTarget(ev.target)) return;
        const url = postUrlAround(ev.target);
        if (url) capture(url, "threads:save");
      } catch (e) {
        log("warn", "threads dom-click hook error", String(e));
      }
    },
    true,
  );
}
