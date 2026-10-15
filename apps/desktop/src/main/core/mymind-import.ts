import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { NewSave } from "@pond/schema/db";
import { createManualSave } from "./manual-import";
import { persistSave } from "./persist-save";
import { enqueue } from "./pipeline/enqueue";
import { setSaveTags } from "./tags";

const MEDIA_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp4",
  ".pdf",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

const FILE_CARD_TYPES = new Set([
  "audio",
  "file",
  "gif",
  "image",
  "img",
  "pdf",
  "photo",
  "picture",
  "video",
]);

export interface MymindCard {
  id: string;
  type: string;
  title: string;
  url: string;
  content: string;
  note: string;
  tags: string[];
  created: Date | null;
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseMymindCards(csv: string): MymindCard[] | null {
  const rows = parseCsvRows(csv);
  const header = rows[0]?.map((name) => name.trim().toLowerCase());
  if (!header) return null;
  const indexOf = (name: string) => header.indexOf(name);
  if (
    !["title", "url", "content", "note", "id"].some(
      (name) => indexOf(name) >= 0,
    )
  ) {
    return null;
  }
  return rows.slice(1).flatMap((cells) => {
    const value = (name: string) => cells[indexOf(name)]?.trim() ?? "";
    const title = value("title");
    const url = value("url");
    const content = value("content");
    const note = value("note");
    const type = value("type");
    if (!title && !url && !content && !note && !type) return [];
    const created = Date.parse(value("created"));
    return [
      {
        id: value("id"),
        type,
        title,
        url: /^https?:\/\//i.test(url) ? url : "",
        content,
        note,
        tags: value("tags")
          .split(",")
          .map((tag) => tag.trim().replace(/^#/, ""))
          .filter(Boolean),
        created: Number.isNaN(created) ? null : new Date(created),
      },
    ];
  });
}

function isMymindMediaFile(name: string): boolean {
  return MEDIA_EXTENSIONS.has(extname(name).toLowerCase());
}

/** Image and PDF rows have no text of their own. The export writes those as files beside the CSV. */
export function isMymindFileCard(card: MymindCard): boolean {
  return (
    FILE_CARD_TYPES.has(card.type.toLowerCase()) &&
    !card.url &&
    !card.content &&
    !card.note
  );
}

export async function importMymindExport(
  directory: string,
): Promise<
  { ok: true; imported: number; skipped: number } | { ok: false; error: string }
> {
  let cards: MymindCard[] | null = null;
  try {
    cards = parseMymindCards(
      await readFile(join(directory, "cards.csv"), "utf8"),
    );
  } catch {
    cards = null;
  }
  const files = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );
  const media = files.filter(
    (entry) => entry.isFile() && isMymindMediaFile(entry.name),
  );
  if (!cards && media.length === 0) {
    return {
      ok: false,
      error:
        "That folder doesn't include a mymind cards.csv or media files. Choose the folder from Export my mind.",
    };
  }
  let imported = 0;
  let skipped = 0;
  const count = (result: { ok: boolean; skipped?: boolean }) => {
    if (result.ok && !result.skipped) imported += 1;
    else skipped += 1;
  };
  for (const card of cards ?? []) {
    if (isMymindFileCard(card)) continue;
    const note = [card.content, card.note].filter(Boolean).join("\n\n");
    if (card.url && (await importMymindLink(card, note, count))) continue;
    count(
      await createManualSave({
        source: "local",
        sourceId: card.id ? `mymind:${card.id}` : undefined,
        title: card.title || null,
        url: card.url || null,
        note: note || null,
        tags: card.tags,
        savedAt: card.created ?? undefined,
        createdAt: card.created ?? undefined,
      }),
    );
  }
  for (const file of media) {
    count(
      await createManualSave({
        source: "local",
        sourceId: `mymind-file:${basename(file.name)}`,
        filePaths: [join(directory, file.name)],
      }),
    );
  }
  return { ok: true, imported, skipped };
}

async function importMymindLink(
  card: MymindCard,
  note: string,
  count: (result: { ok: boolean; skipped?: boolean }) => void,
): Promise<boolean> {
  let result: { id: string; created: boolean };
  try {
    result = await enqueue(card.url, { trigger: "user:importMymind" });
  } catch {
    return false;
  }
  if (!result.created) {
    count({ ok: true, skipped: true });
    return true;
  }
  try {
    if (card.tags.length > 0) await setSaveTags(result.id, card.tags);
    const patch: Partial<NewSave> = {};
    if (note) patch.notes = note;
    if (card.created) {
      patch.savedAt = card.created;
      patch.createdAt = card.created;
    }
    if (Object.keys(patch).length > 0) {
      await persistSave(result.id, patch, { actorReason: "mymind:import" });
    }
  } catch {
    /** The link is already saved. A failed tag or note write should not import it twice. */
  }
  count({ ok: true });
  return true;
}
