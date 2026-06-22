import type { Source } from "@pond/schema/db";

export { hostToSource, sourceLabel } from "@pond/schema/sources";

export function cookieDomainForSource(source: Source): string | null {
  switch (source) {
    case "twitter":
      return ".x.com";
    case "instagram":
      return ".instagram.com";
    case "tiktok":
      return ".tiktok.com";
    case "pinterest":
      return ".pinterest.com";
    case "youtube":
      return ".youtube.com";
    case "cosmos":
      return ".cosmos.so";
    case "arena":
      return ".are.na";
    case "reddit":
      return ".reddit.com";
    case "threads":
      return ".threads.com";
    case "web":
      return null;
    case "local":
      return null;
  }
}
