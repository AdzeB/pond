import {
  folders,
  savedViews,
  saveFolders,
  saves,
  tagGroupMembers,
  tagGroups,
  tags as tagsTable,
} from "@pond/schema/db";
import { isGroup, type Query } from "@pond/schema/filters/types";
import { inArray } from "drizzle-orm";
import { getDb } from "../db";
import { saveDir } from "../paths";
import { exportEaglePackage } from "./eagle-package";
import { exportFiles } from "./export-files";
import { runLibraryTransfer } from "./library-transfers";
import { getPrefs } from "./prefs";

function folderReferences(query: Query): Set<string> {
  const result = new Set<string>();
  for (const rule of query.rules) {
    if (isGroup(rule)) {
      for (const id of folderReferences(rule)) result.add(id);
    } else if (
      rule.field === "folder" &&
      rule.operator !== "empty" &&
      Array.isArray(rule.value)
    ) {
      for (const id of rule.value) result.add(String(id));
    }
  }
  return result;
}

export function selectionViews(
  views: readonly (typeof savedViews.$inferSelect)[],
  folderIds: ReadonlySet<string>,
) {
  const byId = new Map(views.map((view) => [view.id, view]));
  const included = new Set(
    views
      .filter(
        (view) =>
          view.kind !== "group" &&
          [...folderReferences(view.query)].every((id) => folderIds.has(id)),
      )
      .map((view) => view.id),
  );
  for (const id of included) {
    let parent = byId.get(id)?.parentId ?? null;
    const visited = new Set([id]);
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      included.add(parent);
      parent = byId.get(parent)?.parentId ?? null;
    }
  }
  return views
    .filter((view) => included.has(view.id))
    .map((view) => ({
      id: view.id,
      name: view.name,
      kind: view.kind,
      parent_id: view.parentId,
      question: view.question,
      query: JSON.stringify(view.query),
      sort_key: view.sortKey,
      sort_dir: view.sortDir,
      layout: view.layout,
      sort_order: view.sortOrder,
      created_at: view.createdAt.getTime(),
    }));
}

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
  const [registry, views, groups, members] = options.includeDerived
    ? await Promise.all([
        db.select().from(tagsTable),
        db.select().from(savedViews),
        db.select().from(tagGroups),
        db.select().from(tagGroupMembers),
      ])
    : [[], [], [], []];
  const selectedRegistry = registry.filter((tag) =>
    selectedTags.has(tag.name.toLowerCase()),
  );
  const selectedTagIds = new Set(selectedRegistry.map((tag) => tag.id));
  const selectedMembers = members.filter((member) =>
    selectedTagIds.has(member.tagId),
  );
  const selectedGroupIds = new Set(
    selectedMembers.map((member) => member.groupId),
  );
  return {
    includeDerived: options.includeDerived,
    organization: options.includeDerived
      ? {
          views: selectionViews(views, included),
          tags: selectedRegistry.map((tag) => ({
            ...tag,
            createdAt: tag.createdAt.getTime(),
            lastUsedAt: tag.lastUsedAt?.getTime() ?? null,
          })),
          groups: groups
            .filter((group) => selectedGroupIds.has(group.id))
            .map((group) => ({
              ...group,
              createdAt: group.createdAt.getTime(),
            })),
          members: selectedMembers,
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
      directory: saveDir(save.id),
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
      {
        items: selection.items.map((item) => ({ ...item, folderIds: [] })),
        folders: [],
      },
      destination,
    );
  });
}
