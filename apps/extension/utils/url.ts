import type { Source } from "@pond/schema/db";

export { hostToSource } from "@pond/schema/sources";

export function cookieDomainsForSource(source: Source): string[] {
  switch (source) {
    case "twitter":
      return ["x.com", "twitter.com"];
    case "instagram":
      return ["instagram.com"];
    case "tiktok":
      return ["tiktok.com"];
    case "pinterest":
      return ["pinterest.com"];
    case "youtube":
      return ["youtube.com", "google.com"];
    case "cosmos":
      return ["cosmos.so"];
    case "arena":
      return ["are.na"];
    case "reddit":
      return ["reddit.com"];
    case "threads":
      return ["threads.net", "threads.com", "instagram.com"];
    case "web":
    case "local":
      return [];
  }
}

export function cookieDomainForSource(source: Source): string | null {
  return cookieDomainsForSource(source)[0] ?? null;
}
