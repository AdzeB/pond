import { SOURCES, type Source } from "./db";

const SOURCE_LABELS: Record<Source, string> = {
  twitter: "Twitter",
  instagram: "Instagram",
  pinterest: "Pinterest",
  arena: "Are.na",
  cosmos: "Cosmos",
  tiktok: "TikTok",
  youtube: "YouTube",
  local: "Local",
};

const SOURCE_SET: ReadonlySet<string> = new Set(SOURCES);

export function isSource(value: string): value is Source {
  return SOURCE_SET.has(value);
}

export function sourceLabel(source: Source): string {
  return SOURCE_LABELS[source];
}

export function hostToSource(rawUrl: string): Source | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
  if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com")) {
    return "twitter";
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return "instagram";
  }
  if (
    host === "pinterest.com" ||
    host.endsWith(".pinterest.com") ||
    host === "pin.it"
  ) {
    return "pinterest";
  }
  if (host === "are.na") return "arena";
  if (host === "cosmos.so") return "cosmos";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtu.be"
  ) {
    return "youtube";
  }
  return null;
}
