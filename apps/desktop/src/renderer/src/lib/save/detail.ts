import { collectInfoRows } from "@/components/save-preview/lib/rows";
import { getSourceLabel } from "@/lib/save/source-labels";
import type { Save } from "@/lib/types";
import { formatCount } from "@/lib/util/format";

const ENGAGEMENT_IDS = new Set([
  "views",
  "likes",
  "comments",
  "retweets",
  "quotes",
  "bookmarks",
  "shares",
]);

export interface Metric {
  id: string;
  label: string;
  value: string;
}

export function collectEngagement(save: Save): Metric[] {
  const capture = save.rawJson?.capture;
  const ytdlp = save.rawJson?.ytdlp;
  const m = capture?.metrics ?? {};
  const out: Metric[] = [];
  const push = (id: string, label: string, n: number | null | undefined) => {
    if (n !== null && n !== undefined) {
      out.push({ id, label, value: formatCount(n) });
    }
  };
  push("reposts", "Reposts", m.retweets);
  push("quotes", "Quotes", m.quotes);
  push("bookmarks", "Bookmarks", m.bookmarks ?? m.saves);
  push("views", "Views", m.views ?? m.plays ?? ytdlp?.view_count);
  push("likes", "Likes", m.likes ?? ytdlp?.like_count);
  push("comments", "Comments", m.comments ?? m.replies ?? ytdlp?.comment_count);
  push("shares", "Shares", m.shares);
  return out;
}

type RowKind = "mono" | "author" | "platform" | "text";

export interface DetailRow {
  id: string;
  label: string;
  value: string;
  kind: RowKind;
}

// The link-card destination URL, read from the harvested capture.
function readCardUrl(save: Save): string | undefined {
  const raw = save.rawJson as
    | { capture?: { extras?: { card?: { url?: unknown } } } }
    | null
    | undefined;
  const url = raw?.capture?.extras?.card?.url;
  return typeof url === "string" && url.length > 0 ? url : undefined;
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
    if (ENGAGEMENT_IDS.has(row.id)) continue;
    rows.push({ ...row, kind: "text" });
  }
  return rows;
}

// X strips the trailing link from the tweet's visible text once it becomes a
// card, so the cover stays clean. Surface that link in the Content text, deduped
// against any link the harvested text already kept.
export function composeContentDescription(save: Save): string {
  const base = save.description?.trim() ?? "";
  const cardUrl = readCardUrl(save);
  if (!cardUrl) return base;
  if (!base) return cardUrl;
  return base.includes(cardUrl) ? base : `${base} ${cardUrl}`;
}
