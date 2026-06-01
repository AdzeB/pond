import type { Source } from "@pond/schema/db";
import { hostToSource } from "@pond/schema/sources";

export { sourceLabel } from "@pond/schema/sources";

const AUTH_WALLED: Record<Source, boolean> = {
  twitter: true,
  instagram: true,
  cosmos: true,
  tiktok: true,
  pinterest: false,
  arena: false,
  youtube: false,
  local: false,
};

export function classifyUrl(rawUrl: string): {
  source: Source | null;
  authWalled: boolean;
} {
  const source = hostToSource(rawUrl);
  return { source, authWalled: source ? AUTH_WALLED[source] : false };
}

export function homeUrlForSource(source: Source): string {
  switch (source) {
    case "twitter":
      return "https://x.com/login";
    case "instagram":
      return "https://www.instagram.com/accounts/login/";
    case "cosmos":
      return "https://www.cosmos.so/login";
    case "tiktok":
      return "https://www.tiktok.com/login";
    case "pinterest":
      return "https://www.pinterest.com/login/";
    case "arena":
      return "https://www.are.na/log-in";
    case "youtube":
      return "https://accounts.google.com/ServiceLogin?service=youtube";
    case "local":
      // Local imports have no remote account, so there is no login page.
      return "";
  }
}

export function supportsYtDlp(source: Source | null): boolean {
  if (!source) return false;
  switch (source) {
    case "twitter":
    case "instagram":
    case "cosmos":
    case "tiktok":
    case "youtube":
      return true;
    case "pinterest":
    case "arena":
    case "local":
      return false;
  }
}
