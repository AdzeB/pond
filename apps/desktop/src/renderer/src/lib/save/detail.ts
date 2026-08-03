import { collectInfoRows } from "@/components/save/preview/lib/rows";
import { getSourceLabel } from "@/lib/save/source-labels";
import type { Save } from "@/lib/types";

type RowKind = "mono" | "author" | "platform" | "text";

export interface DetailRow {
  id: string;
  label: string;
  value: string;
  kind: RowKind;
}

/** The link-card destination URL, read from the harvested capture. */
function readCardUrl(save: Save): string | undefined {
  const raw = save.rawJson as
    | { capture?: { extras?: { card?: { url?: unknown } } } }
    | null
    | undefined;
  const url = raw?.capture?.extras?.card?.url;
  return typeof url === "string" && url.length > 0 ? url : undefined;
}

/** X's own shortener; hiding it keeps Content focused on real destinations and prose. */
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

export function collectIdentityRows(save: Save): DetailRow[] {
  const rows: DetailRow[] = [
    { id: "id", label: "ID", value: save.id, kind: "mono" },
  ];
  if (save.author) {
    rows.push({
      id: "author",
      label: "Author",
      value: save.author,
      kind: "author",
    });
  }
  rows.push({
    id: "platform",
    label: "Platform",
    value: getSourceLabel(save.source),
    kind: "platform",
  });
  for (const row of collectInfoRows(save)) {
    rows.push({ ...row, kind: "text" });
  }
  return rows;
}

/** X strips the trailing link from a tweet's visible text once it becomes a card; surface that destination here when it isn't just another t.co shortlink. */
export function composeContentDescription(save: Save): string {
  const base = stripTwitterShortUrls(save.description?.trim() ?? "");
  const cardUrl = readCardUrl(save);
  if (!cardUrl || isTwitterShortUrl(cardUrl)) return base;
  if (!base) return cardUrl;
  return base.includes(cardUrl) ? base : `${base} ${cardUrl}`;
}
