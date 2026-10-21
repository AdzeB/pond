import { existsSync } from "node:fs";
import { basename, extname } from "node:path";
import { type SaveFile, saves } from "@pond/schema/db";
import { pickCardFile } from "@shared/save-file-names";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { readLibraryMedia } from "../core/storage/library-media-storage";
import { getDb } from "../db";
import { saveFile } from "../paths";
import { apiError } from "./errors";

const IMAGE_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
]);

export async function saveThumbHandler(c: Context): Promise<Response> {
  const id = c.req.query("id");
  if (!id) return apiError(c, "invalid_request", "Pass a Save id as ?id=.");

  const db = await getDb();
  const [row] = await db
    .select({ files: saves.files, coverIndex: saves.coverIndex })
    .from(saves)
    .where(eq(saves.id, id))
    .limit(1);
  if (!row) return apiError(c, "save_not_found", `No Save has the id ${id}.`);

  const noThumbnail = () =>
    apiError(c, "no_thumbnail", "This Save has no image to show.");
  const list: SaveFile[] = row.files ?? [];
  const cover = pickCardFile(list);
  if (!cover) return noThumbnail();

  const type =
    cover.mimeType?.startsWith("image/") === true
      ? cover.mimeType
      : IMAGE_TYPES.get(extname(cover.path).toLowerCase());
  if (!type) return noThumbnail();

  /** File names come from our own DB, but basename() keeps a corrupted row from escaping the Save directory. */
  const path = saveFile(id, basename(cover.path));
  if (!existsSync(path)) return noThumbnail();

  const bytes = await readLibraryMedia(path);
  return c.body(Uint8Array.from(bytes), 200, {
    "content-type": type,
    "cache-control": "private, max-age=300",
  });
}
