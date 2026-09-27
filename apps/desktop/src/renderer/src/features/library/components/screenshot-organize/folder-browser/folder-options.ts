import type { Folder } from "@pond/schema/db";

export interface ScreenshotFolderOption {
  id: string;
  name: string;
  path: string;
  depth: number;
  hasChildren: boolean;
}

export function screenshotFolderOptions(
  folders: readonly Folder[],
  search: string,
  collapsed: ReadonlySet<string>,
): ScreenshotFolderOption[] {
  const ids = new Set(folders.map((folder) => folder.id));
  const children = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const parent =
      folder.parentId && ids.has(folder.parentId) ? folder.parentId : null;
    const siblings = children.get(parent) ?? [];
    siblings.push(folder);
    children.set(parent, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }
  const needle = search.trim().toLowerCase();
  const result: ScreenshotFolderOption[] = [];
  const visited = new Set<string>();
  function visit(parent: string | null, ancestors: string[]) {
    for (const folder of children.get(parent) ?? []) {
      if (visited.has(folder.id)) continue;
      visited.add(folder.id);
      const path = [...ancestors, folder.name];
      if (!needle || path.join(" / ").toLowerCase().includes(needle)) {
        result.push({
          id: folder.id,
          name: folder.name,
          path: path.join(" / "),
          depth: ancestors.length,
          hasChildren: children.has(folder.id),
        });
      }
      if (needle || !collapsed.has(folder.id)) visit(folder.id, path);
    }
  }
  visit(null, []);
  return result;
}
