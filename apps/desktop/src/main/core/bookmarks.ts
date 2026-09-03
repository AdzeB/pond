const HREF_RE = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;

export function parseNetscapeBookmarks(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(HREF_RE)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      if (!url.hostname) continue;
      const href = url.toString();
      if (seen.has(href)) continue;
      seen.add(href);
      urls.push(href);
    } catch {}
  }
  return urls;
}
