import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type Folder,
  folders as foldersTable,
  type NewFolder,
  saveFolders as saveFoldersTable,
} from "@pond/schema/db";
import { asc, eq, inArray } from "drizzle-orm";
import { ulid } from "ulid";
import { getDb } from "../db";
import { INFO_FILE, type InfoDoc } from "../lib/library-format";
import { itemDir } from "../paths";

export async function listFolders(): Promise<Folder[]> {
  const db = await getDb();
  return db
    .select()
    .from(foldersTable)
    .orderBy(asc(foldersTable.sortOrder), asc(foldersTable.name));
}

export async function createFolder(input: {
  name: string;
  parentId?: string | null;
  color?: string | null;
}): Promise<Folder> {
  const name = input.name.trim() || "Untitled";
  const db = await getDb();
  const row: NewFolder = {
    id: ulid(),
    parentId: input.parentId ?? null,
    name,
    color: input.color ?? null,
    sortOrder: 0,
  };
  await db.insert(foldersTable).values(row);
  const created = await db
    .select()
    .from(foldersTable)
    .where(eq(foldersTable.id, row.id))
    .then((rows) => rows[0]);
  if (!created) throw new Error("folder create failed");
  return created;
}

export async function renameFolder(
  id: string,
  name: string,
): Promise<{ ok: boolean }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false };
  const db = await getDb();
  await db
    .update(foldersTable)
    .set({ name: trimmed })
    .where(eq(foldersTable.id, id));
  return { ok: true };
}

export async function deleteFolder(id: string): Promise<{ ok: boolean }> {
  const all = await listFolders();
  const ids = collectDescendants(id, all);
  const db = await getDb();
  await db
    .delete(saveFoldersTable)
    .where(inArray(saveFoldersTable.folderId, ids));
  await db.delete(foldersTable).where(inArray(foldersTable.id, ids));
  return { ok: true };
}

function collectDescendants(id: string, all: Folder[]): string[] {
  const ids = [id];
  for (const folder of all) {
    if (folder.parentId === id) {
      ids.push(...collectDescendants(folder.id, all));
    }
  }
  return ids;
}

export async function folderIdsForSave(saveId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ folderId: saveFoldersTable.folderId })
    .from(saveFoldersTable)
    .where(eq(saveFoldersTable.saveId, saveId));
  return rows.map((row) => row.folderId);
}

async function persistFolderIdsOnInfo(
  saveId: string,
  folderIds: string[],
): Promise<void> {
  const path = join(itemDir(saveId), INFO_FILE);
  try {
    const raw = await readFile(path, "utf8");
    const info = JSON.parse(raw) as InfoDoc;
    info.folderIds = folderIds;
    await writeFile(path, JSON.stringify(info, null, 2));
  } catch {
    return;
  }
}

export async function memberships(): Promise<
  Array<{ saveId: string; folderId: string }>
> {
  const db = await getDb();
  return db
    .select({
      saveId: saveFoldersTable.saveId,
      folderId: saveFoldersTable.folderId,
    })
    .from(saveFoldersTable);
}

export async function setSaveFolders(
  saveId: string,
  folderIds: string[],
): Promise<{ ok: boolean }> {
  const unique = [...new Set(folderIds.filter(Boolean))];
  const db = await getDb();
  await db.delete(saveFoldersTable).where(eq(saveFoldersTable.saveId, saveId));
  if (unique.length > 0) {
    await db
      .insert(saveFoldersTable)
      .values(unique.map((folderId) => ({ saveId, folderId })));
  }
  await persistFolderIdsOnInfo(saveId, unique);
  return { ok: true };
}

export async function addSavesToFolder(
  folderId: string,
  saveIds: string[],
): Promise<{ ok: boolean }> {
  const db = await getDb();
  for (const saveId of saveIds) {
    const existing = await db
      .select()
      .from(saveFoldersTable)
      .where(eq(saveFoldersTable.saveId, saveId));
    if (existing.some((row) => row.folderId === folderId)) continue;
    await db.insert(saveFoldersTable).values({ saveId, folderId });
  }
  for (const saveId of [...new Set(saveIds.filter(Boolean))]) {
    await persistFolderIdsOnInfo(saveId, await folderIdsForSave(saveId));
  }
  return { ok: true };
}

export async function importFolderTree(
  nodes: Array<{
    id: string;
    name: string;
    parentId: string | null;
    color?: string | null;
  }>,
): Promise<Map<string, string>> {
  const db = await getDb();
  const mapped = new Map<string, string>();
  for (const node of nodes) {
    const id = ulid();
    mapped.set(node.id, id);
    await db.insert(foldersTable).values({
      id,
      parentId: node.parentId ? (mapped.get(node.parentId) ?? null) : null,
      name: node.name,
      color: node.color ?? null,
      sortOrder: 0,
    });
  }
  return mapped;
}
