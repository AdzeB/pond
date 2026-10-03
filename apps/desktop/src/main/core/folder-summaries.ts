import { folders, saveFolders, saves } from "@pond/schema/db";
import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { FolderSummary } from "../../shared/folder-contracts";
import type { Db } from "../database/client";
import { getDb } from "../db";

export async function folderSummaries(
  parentId: string,
): Promise<FolderSummary[]> {
  return queryFolderSummaries(await getDb(), parentId);
}

export async function queryFolderSummaries(
  db: Db,
  parentId: string,
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
    z.array(z.object({ id: z.string(), saveId: z.string() })).parse(
      db.all(
        sql`with recursive folder_tree(root_id,folder_id) as (
              select id,id from folders where parent_id=${parentId}
              union all
              select folder_tree.root_id,folders.id
              from folder_tree
              join folders on folders.parent_id=folder_tree.folder_id
            ),
            candidates(root_id,save_id,saved_at) as (
              select folder_tree.root_id,saves.id,saves.saved_at
              from folder_tree
              join save_folders on save_folders.folder_id=folder_tree.folder_id
              join saves on saves.id=save_folders.save_id
              where saves.deleted_at is null
                and saves.status='complete'
              group by folder_tree.root_id,saves.id,saves.saved_at
            ),
            ranked(root_id,save_id,rank) as (
              select root_id,save_id,row_number() over (
                partition by root_id order by saved_at desc,save_id desc
              )
              from candidates
            )
            select root_id as id,save_id as saveId
            from ranked
            where rank<=4
            order by root_id,rank`,
      ),
    ),
  ]);

  const saveCountById = new Map(saveCounts.map((row) => [row.id, row.value]));
  const childCountById = new Map(
    childCounts.flatMap((row) => (row.id ? [[row.id, row.value]] : [])),
  );
  const coversById = new Map<string, string[]>();
  for (const row of coverCandidates) {
    const ids = coversById.get(row.id) ?? [];
    ids.push(row.saveId);
    coversById.set(row.id, ids);
  }

  return children.map((folder) => ({
    id: folder.id,
    directSaveCount: saveCountById.get(folder.id) ?? 0,
    childFolderCount: childCountById.get(folder.id) ?? 0,
    previewSaveIds: coversById.get(folder.id) ?? [],
  }));
}
