import type { Folder, Prefs, Save } from "@pond/schema/db";
import type { Transaction } from "@pond/schema/tx";
import { normalizeTagList } from "./tags";

export function inheritedFolderTags(
  folderIds: readonly string[],
  folders: readonly Pick<Folder, "id" | "parentId">[],
  rules: Prefs["folderRules"],
): string[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const tags: string[] = [];
  for (const id of folderIds) {
    const visited = new Set<string>();
    let current: string | null = id;
    while (current) {
      if (visited.has(current))
        throw new Error("The folder hierarchy contains a cycle.");
      visited.add(current);
      const folder = byId.get(current);
      if (!folder) throw new Error("A destination folder no longer exists.");
      tags.push(...(rules[current]?.automaticTags ?? []));
      current = folder.parentId;
    }
  }
  return normalizeTagList(tags);
}

export function planFolderAssignment(
  save: Pick<Save, "id" | "tags">,
  beforeFolders: string[],
  folderIds: string[],
  automaticTags: string[],
): Transaction[] {
  const txs: Transaction[] = [];
  const unique = [...new Set(folderIds)];
  const meta = { actor: "user" as const, actorReason: "folder-assignment" };
  if (
    unique.length !== beforeFolders.length ||
    unique.some((id) => !beforeFolders.includes(id))
  )
    txs.push({
      kind: "update",
      model: "save_folder",
      id: save.id,
      patch: { folderIds: unique },
      before: { folderIds: beforeFolders },
      meta,
    });
  const tags = normalizeTagList([...(save.tags ?? []), ...automaticTags]);
  if (JSON.stringify(tags) !== JSON.stringify(save.tags ?? []))
    txs.push({
      kind: "update",
      model: "save",
      id: save.id,
      patch: { tags },
      before: { tags: save.tags },
      meta,
    });
  return txs;
}
