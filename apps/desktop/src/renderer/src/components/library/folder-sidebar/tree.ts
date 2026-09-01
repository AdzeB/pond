interface Guide {
  parentId: string;
  continues: boolean;
}

export function flattenFolderTree<
  T extends { id: string; parentId: string | null },
>(folders: T[]): Array<{ folder: T; depth: number; guides: Guide[] }> {
  const children = new Map<string | null, T[]>();
  for (const folder of folders) {
    const siblings = children.get(folder.parentId) ?? [];
    siblings.push(folder);
    children.set(folder.parentId, siblings);
  }

  const rows: Array<{ folder: T; depth: number; guides: Guide[] }> = [];
  function visit(parentId: string | null, ancestors: Guide[]) {
    const siblings = children.get(parentId) ?? [];
    siblings.forEach((folder, index) => {
      const guides =
        parentId === null
          ? []
          : [
              ...ancestors,
              { parentId, continues: index < siblings.length - 1 },
            ];
      rows.push({ folder, depth: guides.length, guides });
      visit(folder.id, guides);
    });
  }
  visit(null, []);
  return rows;
}
