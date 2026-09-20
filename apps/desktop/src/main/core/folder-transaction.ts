import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { folders, saveFolders, saves } from "@pond/schema/db";
import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { StoredInfoDocSchema } from "../lib/library-format";
import { itemDir } from "../paths";
import {
  decodeLibraryFile,
  encodeLibraryFile,
} from "./security/library-file-storage";

export async function writeFolderMemberships(
  saveId: string,
  folderIds: readonly string[],
  directory = itemDir(saveId),
): Promise<void> {
  const path = join(directory, "info.json");
  const info = StoredInfoDocSchema.parse(
    JSON.parse(decodeLibraryFile(path, await readFile(path)).toString("utf8")),
  );
  info.folderIds = [...new Set(folderIds)];
  await writeFile(path, encodeLibraryFile(path, JSON.stringify(info, null, 2)));
}
export function replaceFolderMemberships(
  db: Db,
  saveId: string,
  folderIds: readonly string[],
): void {
  const unique = [...new Set(folderIds)];
  if (
    !db.select({ id: saves.id }).from(saves).where(eq(saves.id, saveId)).get()
  )
    throw new Error("The Save no longer exists.");
  const valid = unique.length
    ? db
        .select({ id: folders.id })
        .from(folders)
        .where(inArray(folders.id, unique))
        .all()
    : [];
  if (valid.length !== unique.length)
    throw new Error("A destination folder no longer exists.");
  db.delete(saveFolders).where(eq(saveFolders.saveId, saveId)).run();
  if (unique.length)
    db.insert(saveFolders)
      .values(unique.map((folderId) => ({ saveId, folderId })))
      .run();
}
