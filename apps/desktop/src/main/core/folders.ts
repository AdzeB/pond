import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type Folder,
  folders as foldersTable,
  type NewFolder,
  saveFolders as saveFoldersTable,
} from "@pond/schema/db";
import type { Transaction } from "@pond/schema/tx";
import { asc, eq, inArray } from "drizzle-orm";
import { ulid } from "ulid";
import { getDb } from "../db";
import { INFO_FILE, StoredInfoDocSchema } from "../lib/library-format";
import { itemDir } from "../paths";
import { executeBatch, executeTransaction } from "./executor";
import { folderIdsForSave } from "./folder-memberships";

export { folderIdsForSave } from "./folder-memberships";

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
  await executeTransaction({
    kind: "create",
    model: "folder",
    id: row.id,
    data: row,
    meta: { actor: "user", actorReason: "folder-create" },
  });
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
  const row = (
    await db.select().from(foldersTable).where(eq(foldersTable.id, id))
  )[0];
  if (!row) return { ok: false };
  await executeTransaction({
    kind: "update",
    model: "folder",
    id,
    patch: { name: trimmed },
    before: { name: row.name },
    meta: { actor: "user", actorReason: "folder-rename" },
  });
  return { ok: true };
}

export async function deleteFolder(id: string): Promise<{ ok: boolean }> {
  const all = await listFolders();
  const ids = collectDescendants(id, all);
  const db = await getDb();
  await db
    .delete(saveFoldersTable)
    .where(inArray(saveFoldersTable.folderId, ids));
  const txs: Transaction[] = [];
  for (const folderId of ids.reverse()) {
    const row = all.find((folder) => folder.id === folderId);
    if (!row) continue;
    txs.push({
      kind: "delete",
      model: "folder",
      id: folderId,
      before: row,
      meta: { actor: "user", actorReason: "folder-delete" },
    });
  }
  if (txs.length > 0) await executeBatch(txs);
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

async function persistFolderIdsOnInfo(
  saveId: string,
  folderIds: string[],
): Promise<void> {
  const path = join(itemDir(saveId), INFO_FILE);
  try {
    const raw = await readFile(path, "utf8");
    const info = StoredInfoDocSchema.parse(JSON.parse(raw));
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
  for (const saveId of new Set(saveIds.filter(Boolean))) {
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
    sortOrder?: number;
  }>,
): Promise<Map<string, string>> {
  const mapped = new Map<string, string>();
  const txs: Transaction[] = [];
  for (const node of nodes) {
    const id = ulid();
    mapped.set(node.id, id);
    const data: NewFolder = {
      id,
      parentId: node.parentId ? (mapped.get(node.parentId) ?? null) : null,
      name: node.name,
      color: node.color ?? null,
      sortOrder: node.sortOrder ?? 0,
    };
    txs.push({
      kind: "create",
      model: "folder",
      id,
      data,
      meta: { actor: "user", actorReason: "folder-import" },
    });
  }
  if (txs.length > 0) await executeBatch(txs);
  return mapped;
}
