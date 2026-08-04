function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://");
}

/** Forgive a missing scheme so "example.com/page" classifies as a real URL. */
function withScheme(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
  return value;
}

function clipboardTokens(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .filter((t) => t && !t.startsWith("#"));
}

/** Absolute paths from `file://` tokens (Finder/Explorer paste often ships these instead of File objects). */
export function filePathsFromText(value: string): string[] {
  const out: string[] = [];
  for (const token of clipboardTokens(value)) {
    if (!token.startsWith("file:")) continue;
    try {
      const url = new URL(token);
      if (url.protocol !== "file:") continue;
      let path = decodeURIComponent(url.pathname);
      if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
      if (path) out.push(path);
    } catch {
      /** Skip malformed file URLs. */
    }
  }
  return out;
}

/** Splits free text into normalized URLs, or null when any part isn't clearly a link. */
export function asUrlList(value: string): string[] | null {
  const tokens = clipboardTokens(value).map(withScheme);
  if (tokens.length === 0) return null;
  return tokens.every(looksLikeUrl) ? tokens : null;
}
