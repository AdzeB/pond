import { type IncomingSaveRule, saveFolders } from "@pond/schema/db";
import { inArray } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { assignSaveFolders, listFolders } from "../folders";
import { addTagsToSaves } from "../tags";

const CHUNK = 500;

async function addToFolder(
  saveIds: readonly string[],
  folderId: string,
): Promise<void> {
  if (!(await listFolders()).some((folder) => folder.id === folderId)) return;
  const db = await getDb();
  for (let offset = 0; offset < saveIds.length; offset += CHUNK) {
    const batch = saveIds.slice(offset, offset + CHUNK);
    const rows = await db
      .select({ saveId: saveFolders.saveId, folderId: saveFolders.folderId })
      .from(saveFolders)
      .where(inArray(saveFolders.saveId, batch));
    const have = new Map<string, string[]>();
    for (const row of rows) {
      have.set(row.saveId, [...(have.get(row.saveId) ?? []), row.folderId]);
    }
    const assignments = batch
      .filter((saveId) => !have.get(saveId)?.includes(folderId))
      .map((saveId) => ({
        saveId,
        folderIds: [...(have.get(saveId) ?? []), folderId],
      }));
    if (assignments.length > 0) await assignSaveFolders(assignments, false);
  }
}

/** Filing is a convenience on top of the import, so a failure is logged and the sync still completes. */
export async function organizeIncoming(
  saveIds: readonly string[],
  rule: IncomingSaveRule | undefined,
  trigger: string,
): Promise<void> {
  if (!rule || saveIds.length === 0) return;
  try {
    if (rule.folderId) await addToFolder(saveIds, rule.folderId);
    if (rule.tags?.length) {
      await addTagsToSaves(saveIds, rule.tags, `${trigger}:incoming-tags`);
    }
  } catch (error) {
    log.warn(`[pond ${trigger}] filing incoming saves failed`, error);
  }
}
