import { collectInfoRows } from "@/components/save/preview/lib/rows";
import { getSourceLabel } from "@/lib/save/source-labels";
import {
  type AccountRef,
  accountDisplayName,
  findAccountRef,
} from "@/lib/search/account-aliases";
import type { Save } from "@/lib/types";

type RowKind = "mono" | "author" | "account" | "platform" | "text";

export interface DetailRow {
  id: string;
  label: string;
  value: string;
  kind: RowKind;
  href?: string;
  accountId?: string;
  avatarUrl?: string | null;
  watch?: boolean;
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

const DETAIL_GROUPS = [
  { title: "Properties", ids: ["author", "from", "platform", "type"] },
  {
    title: "Activity",
    ids: [
      "views",
      "likes",
      "comments",
      "retweets",
      "quotes",
      "bookmarks",
      "shares",
    ],
  },
  { title: "File", ids: ["duration", "dimensions", "size", "id"] },
  { title: "Dates", ids: ["published", "imported", "modified"] },
] as const;

export interface DetailGroup {
  title: string;
  rows: DetailRow[];
}

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function profileUrlFromHandle(source: string, handle: string): string | null {
  const h = encodeURIComponent(handle.replace(/^@/, ""));
  if (!h) return null;
  if (source === "instagram") return `https://www.instagram.com/${h}/`;
  if (source === "twitter") return `https://x.com/${h}`;
  if (source === "threads") return `https://www.threads.com/@${h}`;
  if (source === "reddit") return `https://www.reddit.com/user/${h}/`;
  if (source === "tiktok") return `https://www.tiktok.com/@${h}`;
  if (source === "pinterest") return `https://www.pinterest.com/${h}/`;
  if (source === "arena") return `https://www.are.na/${h}`;
  if (source === "youtube") return `https://www.youtube.com/@${h}`;
  return null;
}

export function pickAuthorProfileUrl(
  save: Pick<Save, "source" | "rawJson">,
): string | null {
  const capture = save.rawJson?.capture;
  const fromCapture = asHttpUrl(capture?.author?.profileUrl);
  if (fromCapture) return fromCapture;

  const fromYtdlp =
    asHttpUrl(save.rawJson?.ytdlp?.channel_url) ??
    asHttpUrl(save.rawJson?.ytdlp?.uploader_url);
  if (fromYtdlp) return fromYtdlp;

  const handle = capture?.author?.handle?.trim();
  if (!handle) return null;
  return profileUrlFromHandle(save.source, handle);
}

function pickFromRow(
  save: Pick<Save, "accountId">,
  refs: readonly AccountRef[],
): DetailRow | null {
  const id = save.accountId?.trim();
  if (!id) return null;
  const ref = findAccountRef(id, refs);
  if (!ref) return null;
  return {
    id: "from",
    label: "From",
    value: accountDisplayName(ref),
    kind: "account",
    accountId: ref.id,
    ...(ref.avatarUrl ? { avatarUrl: ref.avatarUrl } : {}),
    ...(ref.watch ? { watch: true } : {}),
  };
}

export function collectIdentityRows(
  save: Save,
  refs: readonly AccountRef[] = [],
): DetailRow[] {
  const rows: DetailRow[] = [
    { id: "id", label: "ID", value: save.id, kind: "mono" },
  ];
  if (save.author) {
    const href = pickAuthorProfileUrl(save) ?? undefined;
    rows.push({
      id: "author",
      label: "Author",
      value: save.author,
      kind: "author",
      ...(href ? { href } : {}),
    });
  }
  const from = pickFromRow(save, refs);
  if (from) rows.push(from);
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

/** Unknown ids fall through into Properties. */
export function groupDetailRows(rows: DetailRow[]): DetailGroup[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const placed = new Set<string>();
  const groups: DetailGroup[] = [];

  for (const group of DETAIL_GROUPS) {
    const next = group.ids.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      placed.add(id);
      return [row];
    });
    if (next.length === 0) continue;
    groups.push({ title: group.title, rows: next });
  }

  const leftover = rows.filter((row) => !placed.has(row.id));
  if (leftover.length > 0) {
    const properties = groups.find((group) => group.title === "Properties");
    if (properties) properties.rows.push(...leftover);
    else groups.unshift({ title: "Properties", rows: leftover });
  }

  return groups;
}

function normalizeForCompare(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Title that is the content plus a trailing URL (or the same words) should not get its own island. */
export function isSameTitleAndContent(title: string, content: string): boolean {
  const a = normalizeForCompare(title);
  const b = normalizeForCompare(content);
  return a.length > 0 && a === b;
}

/** X strips the trailing link from a tweet's visible text once it becomes a card; surface that destination here when it isn't just another t.co shortlink. */
export function composeContentDescription(save: Save): string {
  const base = stripTwitterShortUrls(save.description?.trim() ?? "");
  const cardUrl = readCardUrl(save);
  if (!cardUrl || isTwitterShortUrl(cardUrl)) return base;
  if (!base) return cardUrl;
  return base.includes(cardUrl) ? base : `${base} ${cardUrl}`;
}
