import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createManualSave } from "./manual-import";

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

export interface MymindCard {
  id: string;
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
    if (!title && !url && !content && !note) return [];
    const created = Date.parse(value("created"));
    return [
      {
        id: value("id"),
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
      error: "That folder doesn't include a mymind cards.csv or media files.",
    };
  }
  let imported = 0;
  let skipped = 0;
  const count = (result: { ok: boolean; skipped?: boolean }) => {
    if (result.ok && !result.skipped) imported += 1;
    else skipped += 1;
  };
  for (const card of cards ?? []) {
    const note = [card.content, card.note].filter(Boolean).join("\n\n");
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
