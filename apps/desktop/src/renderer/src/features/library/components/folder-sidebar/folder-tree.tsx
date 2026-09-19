import { IconPlusOutline18 } from "@pond/icons/outline/18";
import type { Folder } from "@pond/schema/db";
import { Button, Sidebar } from "@pond/ui";
import { useState } from "react";
import { usePrefs } from "@/features/settings/state/prefs";
import { notify } from "@/shared/lib/toast";
import { useSidebarCounts } from "../../hooks/use-sidebar-counts";
import { folders } from "../../state/folders";
import type { LibraryNav } from "../../state/library-chrome";
import { useIncludeSubfolders, useViewStore } from "../../state/view-store";
import { folderIdsForExport } from "../folder-context-menu/folder-context-menu";
import { type FolderTool, FolderToolsDialog } from "../folder-tools";
import { FolderTreeRow } from "./folder-tree-row";
import { useFolderDragDrop } from "./use-folder-drag-drop";
import {
  useFolderTreeState,
  useRevealFolderDrop,
} from "./use-folder-tree-state";

interface FolderTreeProps {
  folderRows: Folder[];
  libraryPage: boolean;
  nav: LibraryNav;
}

export function FolderTree({ folderRows, libraryPage, nav }: FolderTreeProps) {
  const [folderTool, setFolderTool] = useState<FolderTool | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderViews] = usePrefs("folderViews");
  const includeSubfolders = useIncludeSubfolders();
  const { sortKey, sortDir } = useViewStore();
  const counts = useSidebarCounts();
  const tree = useFolderTreeState(folderRows);
  const drag = useFolderDragDrop({
    folderRows,
    revealFolder: tree.revealFolder,
  });
  useRevealFolderDrop(drag.folderDrop, tree.revealFolder);

  async function createFolder(parentId?: string): Promise<void> {
    if (creatingFolder) return;
    setCreatingFolder(true);
    setFoldersOpen(true);
    try {
      const folder = await window.pond.query("folders.create", {
        name: "Untitled",
        parentId,
      });
      await folders.refresh();
      setEditingFolderId(folder.id);
    } catch (error) {
      notify({
        id: "create-folder",
        title: "Couldn't create folder",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setCreatingFolder(false);
    }
  }

  return (
    <>
      <Sidebar.CollapsibleGroup
        open={foldersOpen}
        onOpenChange={setFoldersOpen}
      >
        <Sidebar.GroupHeader>
          <Sidebar.CollapsibleGroupLabel>Folders</Sidebar.CollapsibleGroupLabel>
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="New Folder"
            disabled={creatingFolder}
            onClick={() => void createFolder()}
          >
            <IconPlusOutline18 />
          </Button>
        </Sidebar.GroupHeader>
        <Sidebar.CollapsibleGroupContent
          data-folder-drag={drag.draggingFolderId || undefined}
        >
          {tree.nested.map(({ folder, depth }) => {
            const viewing =
              libraryPage && nav.kind === "folder" && nav.id === folder.id;
            const presentation = folderViews[folder.id];
            const includeThisFolder = viewing
              ? includeSubfolders
              : (presentation?.includeSubfolders ?? true);
            const folderSortKey = viewing
              ? sortKey
              : (presentation?.sortKey ?? "savedAt");
            return (
              <FolderTreeRow
                key={folder.id}
                collapsed={tree.collapsed.has(folder.id)}
                count={counts.folders[folder.id] ?? 0}
                creating={creatingFolder}
                depth={depth}
                editing={editingFolderId === folder.id}
                exportIds={folderIdsForExport(
                  folder.id,
                  folderRows,
                  includeThisFolder,
                )}
                folder={folder}
                folderDrop={drag.folderDrop}
                folderIcon={presentation?.icon}
                folderSortKey={folderSortKey}
                hasChildren={tree.parentIds.has(folder.id)}
                includeSubfolders={includeThisFolder}
                nav={nav}
                sameLevelHasChildren={folderRows.some(
                  (row) =>
                    row.parentId === folder.parentId &&
                    tree.parentIds.has(row.id),
                )}
                sortDir={sortDir}
                viewing={viewing}
                dragHandlers={drag.handlersFor(folder)}
                dragging={drag.draggingFolderId === folder.id}
                coverSaveId={presentation?.coverSaveId}
                onCreateFolder={(parentId) => void createFolder(parentId)}
                onFinishEditing={() =>
                  setEditingFolderId((id) => (id === folder.id ? null : id))
                }
                onOpenTool={setFolderTool}
                onStartEditing={setEditingFolderId}
                onToggleAll={tree.toggleAllFolders}
                onToggleFolder={() => tree.toggleFolder(folder.id)}
                onToggleSameLevel={(expanded) =>
                  tree.toggleSameLevel(folder.parentId, expanded)
                }
              />
            );
          })}
        </Sidebar.CollapsibleGroupContent>
      </Sidebar.CollapsibleGroup>
      {folderTool ? (
        <FolderToolsDialog
          tool={folderTool}
          key={`${folderTool.kind}:${folderTool.id}`}
          onClose={() => setFolderTool(null)}
        />
      ) : null}
    </>
  );
}
