import type { Folder } from "@pond/schema/db";
import type { Save } from "@/lib/types";
import type { LibraryNav } from "@/stores/library-chrome";

export function descendantFolderIds(
  id: string,
  folders: readonly Folder[],
): Set<string> {
  const ids = new Set<string>([id]);
  const walk = (parent: string) => {
    for (const folder of folders) {
      if (folder.parentId === parent && !ids.has(folder.id)) {
        ids.add(folder.id);
        walk(folder.id);
      }
    }
  };
  walk(id);
  return ids;
}

export function applyNavFilter(
  saves: readonly Save[],
  nav: LibraryNav,
  memberships: Record<string, string[]>,
  folders: readonly Folder[],
): Save[] {
  if (
    nav.kind === "all" ||
    nav.kind === "trash" ||
    nav.kind === "downloads" ||
    nav.kind === "sources"
  ) {
    return [...saves];
  }
  if (nav.kind === "uncategorized") {
    return saves.filter((save) => (memberships[save.id] ?? []).length === 0);
  }
  if (nav.kind === "folder") {
    const ids = descendantFolderIds(nav.id, folders);
    return saves.filter((save) =>
      (memberships[save.id] ?? []).some((folderId) => ids.has(folderId)),
    );
  }
  if (nav.kind === "tag") {
    const needle = nav.name.toLowerCase();
    return saves.filter((save) =>
      save.tags.some((tag) => tag.toLowerCase() === needle),
    );
  }
  return [...saves];
}
