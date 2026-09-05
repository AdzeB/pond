function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://");
}

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
    } catch {}
  }
  return out;
}

export function asUrlList(value: string): string[] | null {
  const tokens = clipboardTokens(value).map(withScheme);
  if (tokens.length === 0) return null;
  return tokens.every(looksLikeUrl) ? tokens : null;
}
