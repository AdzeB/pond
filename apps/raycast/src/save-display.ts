import { SOURCES, sourceLabel } from "@pond/schema/source-ids";
import type { PondSave } from "./pond-api";

const LINKS = /https?:\/\/\S+/g;
const TRAILING_HASHTAGS = /(?:\s*#[\p{L}\p{N}_]+)+\s*$/u;
const MARKDOWN_SYNTAX = /[\\`*_{}[\]()#+\-.!>|~<]/g;
const DAY = 86_400_000;

export function hostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export function savedDate(save: PondSave): Date {
  return new Date(save.savedAt);
}

export function saveSourceLabel(save: PondSave): string {
  const source = SOURCES.find((id) => id === save.source);
  return source ? sourceLabel(source) : save.source;
}

/** Captions often end in link shorteners and hashtag runs that crowd out the words you search by. */
export function saveTitle(save: PondSave): string {
  const caption = (save.title || save.description || "")
    .replace(LINKS, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = caption.replace(TRAILING_HASHTAGS, "").trim();
  return words || caption || save.author || hostname(save.url);
}

export function saveCaption(save: PondSave): string {
  const caption = save.description || save.title || save.url;
  return caption.replace(MARKDOWN_SYNTAX, "\\$&");
}

export function savedSection(saved: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(saved)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 Days";
  if (days < 30) return "Previous 30 Days";
  return saved.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}
