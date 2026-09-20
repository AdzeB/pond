import {
  folders,
  saveFolders,
  saves,
  tags as tagsTable,
} from "@pond/schema/db";
import { inArray } from "drizzle-orm";
import { getDb } from "../db";
import { itemDir } from "../paths";
import { exportEaglePackage } from "./eagle-package";
import { exportFiles } from "./export-files";
import { runLibraryTransfer } from "./library-transfers";
import { getPrefs } from "./prefs";

async function exportSelection(
  ids: readonly string[],
  options: { includeDerived?: boolean } = {},
) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) throw new Error("Select Saves to export.");
  const db = await getDb();
  const rows = await db.select().from(saves).where(inArray(saves.id, unique));
  if (rows.length !== unique.length)
    throw new Error("One of the selected Saves no longer exists.");
  const memberships = await db
    .select()
    .from(saveFolders)
    .where(inArray(saveFolders.saveId, unique));
  const allFolders = await db.select().from(folders);
  const included = new Set(
    memberships.map((membership) => membership.folderId),
  );
  const byId = new Map(allFolders.map((folder) => [folder.id, folder]));
  for (const id of included) {
    let parent = byId.get(id)?.parentId;
    const visited = new Set<string>([id]);
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      included.add(parent);
      parent = byId.get(parent)?.parentId;
    }
  }
  const selectedTags = new Set(
    rows.flatMap((save) => save.tags ?? []).map((name) => name.toLowerCase()),
  );
  const registry = options.includeDerived
    ? await db.select().from(tagsTable)
    : [];
  return {
    includeDerived: options.includeDerived,
    organization: options.includeDerived
      ? {
          views: [],
          tags: registry
            .filter((tag) => selectedTags.has(tag.name.toLowerCase()))
            .map((tag) => ({
              ...tag,
              createdAt: tag.createdAt.getTime(),
              lastUsedAt: tag.lastUsedAt?.getTime() ?? null,
            })),
          groups: [],
          members: [],
          folderViews: Object.fromEntries(
            Object.entries((await getPrefs()).folderViews).filter(([id]) =>
              included.has(id),
            ),
          ),
          folderRules: Object.fromEntries(
            Object.entries((await getPrefs()).folderRules).filter(([id]) =>
              included.has(id),
            ),
          ),
        }
      : undefined,
    folders: allFolders.filter((folder) => included.has(folder.id)),
    items: rows.map((save) => ({
      save,
      directory: itemDir(save.id),
      folderIds: memberships
        .filter((membership) => membership.saveId === save.id)
        .map((membership) => membership.folderId),
    })),
  };
}

async function exportSaves(
  ids: readonly string[],
  directory: string,
  options: { includeDerived?: boolean } = {},
) {
  return exportFiles({
    directory,
    ...(await exportSelection(ids, options)),
  });
}

export function exportSavesToDirectory(
  ids: readonly string[],
  directory: string,
  options: { includeDerived?: boolean } = {},
) {
  return runLibraryTransfer(() => exportSaves(ids, directory, options));
}

export function exportSavesToEaglePackage(
  ids: readonly string[],
  destination: string,
) {
  return runLibraryTransfer(async () => {
    const selection = await exportSelection(ids);
    return exportEaglePackage(
      { items: selection.items, folders: selection.folders },
      destination,
    );
  });
}
