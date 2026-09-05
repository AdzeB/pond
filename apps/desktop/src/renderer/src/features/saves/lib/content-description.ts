import type { Save } from "@/features/saves/types";

function readCardUrl(save: Save): string | undefined {
  const url = save.rawJson?.capture?.card?.url;
  return url ? url : undefined;
}

function isTwitterShortUrl(url: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./, "") === "t.co";
  } catch {
    return false;
  }
}

function stripTwitterShortUrls(text: string): string {
  return text
    .replace(/https?:\/\/t\.co\/\S+/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function composeContentDescription(save: Save): string {
  const base = stripTwitterShortUrls(save.description?.trim() ?? "");
  const cardUrl = readCardUrl(save);
  if (!cardUrl || isTwitterShortUrl(cardUrl)) return base;
  if (!base) return cardUrl;
  return base.includes(cardUrl) ? base : `${base} ${cardUrl}`;
}
