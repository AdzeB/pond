import { folders, saveFolders, saves } from "@pond/schema/db";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type { FolderSummary } from "../../shared/folder-contracts";
import type { Db } from "../database/client";
import { getDb } from "../db";
import { lockedFolderIds } from "./security/folder-passwords";

export async function folderSummaries(
  parentId: string,
): Promise<FolderSummary[]> {
  const [db, hidden] = await Promise.all([getDb(), lockedFolderIds()]);
  return queryFolderSummaries(db, parentId, hidden);
}

export async function queryFolderSummaries(
  db: Db,
  parentId: string,
  hiddenFolderIds: ReadonlySet<string> = new Set(),
): Promise<FolderSummary[]> {
  const children = await db
    .select({ id: folders.id })
    .from(folders)
    .where(eq(folders.parentId, parentId))
    .orderBy(folders.sortOrder, folders.name);
  const ids = children.map((folder) => folder.id);
  if (ids.length === 0) return [];

  const [saveCounts, childCounts, coverCandidates] = await Promise.all([
    db
      .select({
        id: saveFolders.folderId,
        value: count(saveFolders.saveId),
      })
      .from(saveFolders)
      .innerJoin(saves, eq(saveFolders.saveId, saves.id))
      .where(
        and(
          inArray(saveFolders.folderId, ids),
          isNull(saves.deletedAt),
          eq(saves.status, "complete"),
        ),
      )
      .groupBy(saveFolders.folderId),
    db
      .select({ id: folders.parentId, value: count(folders.id) })
      .from(folders)
      .where(inArray(folders.parentId, ids))
      .groupBy(folders.parentId),
    db
      .select({ id: saves.id, folderId: saveFolders.folderId })
      .from(saveFolders)
      .innerJoin(saves, eq(saveFolders.saveId, saves.id))
      .where(
        and(
          inArray(saveFolders.folderId, ids),
          isNull(saves.deletedAt),
          eq(saves.status, "complete"),
          inArray(saves.mediaType, ["image", "video"]),
        ),
      )
      .orderBy(desc(saves.savedAt), desc(saves.id)),
  ]);

  const saveCountById = new Map(saveCounts.map((row) => [row.id, row.value]));
  const childCountById = new Map(
    childCounts.flatMap((row) => (row.id ? [[row.id, row.value]] : [])),
  );
  const coverById = new Map<string, string>();
  for (const row of coverCandidates) {
    if (!coverById.has(row.folderId)) coverById.set(row.folderId, row.id);
  }

  return children.map((folder) => ({
    id: folder.id,
    directSaveCount: hiddenFolderIds.has(folder.id)
      ? 0
      : (saveCountById.get(folder.id) ?? 0),
    childFolderCount: childCountById.get(folder.id) ?? 0,
    automaticCoverSaveId: hiddenFolderIds.has(folder.id)
      ? null
      : (coverById.get(folder.id) ?? null),
  }));
}
