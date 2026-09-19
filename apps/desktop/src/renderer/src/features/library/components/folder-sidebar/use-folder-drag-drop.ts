import type { Folder } from "@pond/schema/db";
import { useRef, useState } from "react";
import { folders } from "@/features/library/state/folders";
import { selection } from "@/features/saves/state/selection";
import { notify } from "@/shared/lib/toast";
import {
  FOLDER_DRAG_TYPE,
  type FolderDropKind,
  folderDropKind,
  isFolderDrag,
  planFolderSidebarDrop,
} from "./folder-drop";

export interface FolderDropState {
  id: string;
  kind: FolderDropKind;
}

interface UseFolderDragDropInput {
  folderRows: Folder[];
  revealFolder: (id: string) => void;
}

export function useFolderDragDrop({
  folderRows,
  revealFolder,
}: UseFolderDragDropInput) {
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [folderDrop, setFolderDrop] = useState<FolderDropState | null>(null);
  const draggingFolderIdRef = useRef<string | null>(null);

  async function moveFolder(
    draggedId: string,
    folder: Folder,
    kind: FolderDropKind,
  ): Promise<void> {
    const move = planFolderSidebarDrop(draggedId, folder, kind, folderRows);
    if (!move) return;
    try {
      await window.pond.query("folders.move", move);
      await folders.refresh();
      if (move.parentId) revealFolder(move.parentId);
    } catch (error) {
      notify({
        id: "move-folder",
        title: "Couldn't move folder",
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  }

  function handlersFor(folder: Folder) {
    return {
      draggable: true,
      onDragStart(event: React.DragEvent<HTMLElement>) {
        event.dataTransfer.setData(FOLDER_DRAG_TYPE, folder.id);
        event.dataTransfer.effectAllowed = "move";
        draggingFolderIdRef.current = folder.id;
        setDraggingFolderId(folder.id);
      },
      onDragEnd() {
        draggingFolderIdRef.current = null;
        setDraggingFolderId(null);
        setFolderDrop(null);
      },
      onDragOver(event: React.DragEvent<HTMLElement>) {
        if (isFolderDrag(event.dataTransfer.types)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          const draggedId = draggingFolderIdRef.current;
          if (!draggedId) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const kind = folderDropKind(event.clientY - rect.top, rect.height);
          const allowed = planFolderSidebarDrop(
            draggedId,
            folder,
            kind,
            folderRows,
          );
          setFolderDrop(allowed ? { id: folder.id, kind } : null);
          return;
        }
        if (selection.size() > 0) event.preventDefault();
      },
      onDragLeave(event: React.DragEvent<HTMLElement>) {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setFolderDrop((current) =>
          current?.id === folder.id ? null : current,
        );
      },
      onDrop(event: React.DragEvent<HTMLElement>) {
        event.preventDefault();
        const dragged = event.dataTransfer.getData(FOLDER_DRAG_TYPE);
        draggingFolderIdRef.current = null;
        setDraggingFolderId(null);
        setFolderDrop(null);
        if (dragged) {
          const rect = event.currentTarget.getBoundingClientRect();
          const kind = folderDropKind(event.clientY - rect.top, rect.height);
          void moveFolder(dragged, folder, kind);
          return;
        }
        const ids = [...selection.snapshot()];
        if (ids.length === 0) return;
        void window.pond
          .query("folders.addSaves", {
            folderId: folder.id,
            saveIds: ids,
          })
          .then(() => folders.refresh());
      },
    };
  }

  return { draggingFolderId, folderDrop, handlersFor };
}
