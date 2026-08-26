import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { type SaveFile, saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { getDb } from "../db";
import { itemFile } from "../paths";

const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function itemThumbHandler(c: Context): Promise<Response> {
  const id = c.req.query("id");
  if (!id) return c.json({ status: "error", error: "missing id" }, 400);

  const db = await getDb();
  const [row] = await db
    .select({ files: saves.files, coverIndex: saves.coverIndex })
    .from(saves)
    .where(eq(saves.id, id))
    .limit(1);
  if (!row) return c.json({ status: "error", error: "not found" }, 404);

  const list: SaveFile[] = row.files ?? [];
  const cover = list[row.coverIndex ?? 0] ?? list[0];
  if (!cover) return c.json({ status: "error", error: "no cover" }, 404);

  const type =
    cover.mimeType?.startsWith("image/") === true
      ? cover.mimeType
      : IMAGE_TYPES[extname(cover.path).toLowerCase()];
  if (!type) return c.json({ status: "error", error: "no cover" }, 404);

  /** File names come from our own DB, but basename() keeps a corrupted row from escaping the item dir. */
  const path = itemFile(id, basename(cover.path));
  if (!existsSync(path)) {
    return c.json({ status: "error", error: "no cover" }, 404);
  }

  const bytes = await readFile(path);
  return c.body(bytes, 200, {
    "content-type": type,
    "cache-control": "private, max-age=300",
  });
}
