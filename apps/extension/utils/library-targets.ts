import type { Folder, Tag } from "./messaging";

export interface FolderRow {
  folder: Folder;
  depth: number;
  /** Ancestor names, root first, so search results say where a folder lives. */
  path: string[];
}

/** Flattens folders depth-first; a missing or cyclic parent makes a folder a root. */
export function folderRows(folders: readonly Folder[]): FolderRow[] {
  const ids = new Set(folders.map((folder) => folder.id));
  const children = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const parent =
      folder.parentId && ids.has(folder.parentId) ? folder.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), folder]);
  }
  const rows: FolderRow[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number, path: string[]) => {
    for (const folder of children.get(parent) ?? []) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      rows.push({ folder, depth, path });
      walk(folder.id, depth + 1, [...path, folder.name]);
    }
  };
  walk(null, 0, []);
  for (const folder of folders) {
    if (seen.has(folder.id)) continue;
    seen.add(folder.id);
    rows.push({ folder, depth: 0, path: [] });
    walk(folder.id, 1, [folder.name]);
  }
  return rows;
}

export function searchFolders(
  rows: readonly FolderRow[],
  query: string,
): FolderRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => row.folder.name.toLowerCase().includes(needle));
}

/** Starred tags lead, then the ones you used here recently, then the ones Pond sees most. */
export function rankTags(
  tags: readonly Tag[],
  recent: readonly string[],
  query: string,
  limit: number,
): string[] {
  const needle = query.trim().toLowerCase();
  const recentRank = new Map(recent.map((name, index) => [name, index]));
  const matches = tags.filter(
    (tag) => !needle || tag.name.toLowerCase().includes(needle),
  );
  const score = (tag: Tag) =>
    (needle && tag.name.toLowerCase().startsWith(needle) ? 0 : 1) * 4 +
    (tag.starred ? 0 : 1) * 2 +
    (recentRank.has(tag.name) ? 0 : 1);
  return matches
    .toSorted(
      (a, b) =>
        score(a) - score(b) ||
        (recentRank.get(a.name) ?? 0) - (recentRank.get(b.name) ?? 0) ||
        b.usageCount - a.usageCount ||
        (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit)
    .map((tag) => tag.name);
}
