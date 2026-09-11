import { descendantFolderIds } from "./tree";

export const FOLDER_DRAG_TYPE = "application/x-pond-folder";

export type FolderDropKind = "before" | "into" | "after";

export interface FolderDropRow {
  id: string;
  parentId: string | null;
}

export interface FolderDropMove {
  id: string;
  parentId: string | null;
  beforeId?: string;
}

export function isFolderDrag(types: Iterable<string>): boolean {
  for (const type of types) {
    if (type.toLowerCase() === FOLDER_DRAG_TYPE) return true;
  }
  return false;
}

export function folderDropKind(
  offsetY: number,
  height: number,
): FolderDropKind {
  if (height <= 0) return "into";
  const ratio = offsetY / height;
  if (ratio < 0.28) return "before";
  if (ratio > 0.72) return "after";
  return "into";
}

export function planFolderSidebarDrop(
  draggedId: string,
  target: FolderDropRow,
  kind: FolderDropKind,
  folders: readonly FolderDropRow[],
): FolderDropMove | null {
  if (draggedId === target.id) return null;
  const inside = new Set(descendantFolderIds(draggedId, folders));
  if (kind === "into") {
    if (inside.has(target.id)) return null;
    return { id: draggedId, parentId: target.id };
  }
  if (
    target.parentId === draggedId ||
    (target.parentId !== null && inside.has(target.parentId))
  ) {
    return null;
  }
  if (kind === "before") {
    return {
      id: draggedId,
      parentId: target.parentId,
      beforeId: target.id,
    };
  }
  const siblings = folders.filter((row) => row.parentId === target.parentId);
  const at = siblings.findIndex((row) => row.id === target.id);
  const next = at >= 0 ? siblings[at + 1] : undefined;
  if (next?.id === draggedId) return null;
  return next
    ? { id: draggedId, parentId: target.parentId, beforeId: next.id }
    : { id: draggedId, parentId: target.parentId };
}
