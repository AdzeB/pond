import type { Source } from "@pond/schema/db";

interface NamedCookie {
  name: string;
  value: string;
}

/** Stable per-account user id straight from the cookie payload; tells two accounts apart without any page probe. */
export function identityKeyFromCookies(
  source: Source,
  cookies: NamedCookie[],
): string | null {
  const get = (name: string): string | null => {
    const hit = cookies.find((c) => c.name === name);
    return hit && hit.value.length > 0 ? hit.value : null;
  };
  switch (source) {
    case "twitter": {
      /** twid looks like "u%3D783214" — url-encoded `u=<numeric user id>`. */
      const raw = get("twid");
      if (!raw) return null;
      const decoded = decodeURIComponent(raw);
      const m = decoded.match(/u=(\d+)/);
      return m?.[1] ?? decoded;
    }
    case "instagram":
    case "threads":
      return get("ds_user_id");
    default:
      return null;
  }
}
