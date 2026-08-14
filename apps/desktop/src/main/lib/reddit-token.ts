interface RedditTokenPayload {
  sub?: unknown;
  lid?: unknown;
}

/** Logged-in `token_v2` JWTs use `sub: "user"`; anonymous visitors get `sub: "loid"`. */
export function isLoggedInRedditToken(value: string): boolean {
  const payload = decodeRedditToken(value);
  return payload?.sub === "user";
}

/** Stable account id from a logged-in `token_v2` (`lid` is `t2_<id>`). */
export function redditIdentityFromToken(value: string): string | null {
  const payload = decodeRedditToken(value);
  if (payload?.sub !== "user") return null;
  return typeof payload.lid === "string" && payload.lid.length > 0
    ? payload.lid
    : null;
}

export function decodeRedditToken(value: string): RedditTokenPayload | null {
  const jwt = value.trim();
  const parts = jwt.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const json = Buffer.from(base64UrlToBase64(parts[1]), "base64").toString(
      "utf8",
    );
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object"
      ? (parsed as RedditTokenPayload)
      : null;
  } catch {
    return null;
  }
}

function base64UrlToBase64(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  return pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
}
