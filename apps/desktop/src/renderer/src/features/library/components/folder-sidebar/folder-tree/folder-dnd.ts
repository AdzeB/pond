import type { Active, Announcements, Over } from "@dnd-kit/core";
import type { Folder } from "@pond/schema/db";
import type { RefObject } from "react";
import { type FolderDropKind, folderDropKind } from "../folder-drop";

export function dndFolderDropKind(
  active: Active,
  over: Over,
  pointerY?: number | null,
): FolderDropKind {
  const activeRect =
    active.rect.current.translated ?? active.rect.current.initial;
  const offset =
    pointerY != null
      ? pointerY - over.rect.top
      : activeRect
        ? activeRect.top + activeRect.height / 2 - over.rect.top
        : over.rect.height / 2;
  return folderDropKind(offset, over.rect.height);
}

function relationFor(kind: FolderDropKind) {
  return kind === "into" ? "inside" : kind === "before" ? "before" : "after";
}

export function folderDndAnnouncements(
  folderRows: Folder[],
  pointerY: RefObject<number | null>,
): Announcements {
  return {
    onDragStart: ({ active }) => {
      const folder = folderRows.find((item) => item.id === active.id);
      return `Picked up ${folder?.name ?? "folder"}.`;
    },
    onDragOver: ({ active, over }) => {
      if (!over) return "The folder is no longer over a target.";
      const target = folderRows.find((item) => item.id === over.id);
      const kind = dndFolderDropKind(active, over, pointerY.current);
      return `Move folder ${relationFor(kind)} ${target?.name ?? "folder"}.`;
    },
    onDragEnd: ({ active, over }) => {
      if (!over) return "The folder was dropped without moving.";
      const target = folderRows.find((item) => item.id === over.id);
      const kind = dndFolderDropKind(active, over, pointerY.current);
      return `Moved folder ${relationFor(kind)} ${target?.name ?? "folder"}.`;
    },
    onDragCancel: ({ active }) => {
      const folder = folderRows.find((item) => item.id === active.id);
      return `Moving ${folder?.name ?? "folder"} was canceled.`;
    },
  };
}
