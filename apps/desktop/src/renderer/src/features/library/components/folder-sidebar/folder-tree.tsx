import {
  IconPlusOutline18,
  IconSortArrowsOutline18,
} from "@pond/icons/outline/18";
import type { Folder } from "@pond/schema/db";
import { Button, type MenuItemSpec, Sidebar } from "@pond/ui";
import { useState } from "react";
import { enterFolder } from "@/features/library/operations/enter-folder";
import { usePrefs } from "@/features/settings/state/prefs";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { notify } from "@/shared/lib/toast";
import { useSidebarCounts } from "../../hooks/use-sidebar-counts";
import { folders } from "../../state/folders";
import type { LibraryNav } from "../../state/library-chrome";
import { useIncludeSubfolders } from "../../state/view-store";
import { folderIdsForExport } from "../folder-context-menu/folder-context-menu";
import { FolderCustomizeDialog } from "../folder-customize-dialog";
import { type FolderTool, FolderToolsDialog } from "../folder-tools";
import { FolderUnlockDialog } from "../folder-unlock-dialog";
import { FolderIcon } from "./folder-icons";
import { FolderTreeRow } from "./folder-tree-row";
import { Row } from "./row";
import type { FolderListSort } from "./tree";
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

const FOLDER_SORT_OPTIONS: Array<{
  value: FolderListSort;
  label: string;
}> = [
  { value: "manual", label: "Custom Order" },
  { value: "createdAt", label: "Date Added" },
  { value: "title", label: "Title" },
];

function folderGroupMenuItems(
  sort: FolderListSort,
  onSort: (sort: FolderListSort) => void,
): MenuItemSpec[] {
  return [
    {
      type: "submenu",
      label: "Sort By",
      icon: <IconSortArrowsOutline18 />,
      items: FOLDER_SORT_OPTIONS.map((option) => ({
        type: "checkbox",
        label: option.label,
        checked: sort === option.value,
        onCheckedChange: () => onSort(option.value),
      })),
    },
  ];
}

export function FolderTree({ folderRows, libraryPage, nav }: FolderTreeProps) {
  const [folderTool, setFolderTool] = useState<FolderTool | null>(null);
  const [customizingFolderId, setCustomizingFolderId] = useState<string | null>(
    null,
  );
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [quickUnlock, setQuickUnlock] = useState<{
    folderId: string;
    selectedId: string;
    name: string;
    hint: string | null;
  } | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderViews] = usePrefs("folderViews");
  const [sidebar] = usePrefs("sidebar");
  const includeSubfolders = useIncludeSubfolders();
  const counts = useSidebarCounts();
  const tree = useFolderTreeState(folderRows);
  const drag = useFolderDragDrop({
    folderRows,
    revealFolder: tree.revealFolder,
  });
  useRevealFolderDrop(drag.folderDrop, tree.revealFolder);
  const customizingFolder = customizingFolderId
    ? folderRows.find((folder) => folder.id === customizingFolderId)
    : undefined;
  const quickFolders = folderRows.filter(
    (folder) => folderViews[folder.id]?.quickAccess,
  );

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

  async function openQuickFolder(folder: Folder): Promise<void> {
    await enterFolder(folder.id, (request) => {
      setQuickUnlock({
        folderId: request.unlockId,
        selectedId: folder.id,
        name: folder.name,
        hint: request.hint,
      });
    });
  }

  return (
    <>
      {quickFolders.length > 0 ? (
        <Sidebar.Group>
          <Sidebar.GroupLabel>Quick Access</Sidebar.GroupLabel>
          {quickFolders.map((folder) => (
            <Row
              key={folder.id}
              label={folder.name}
              icon={<FolderIcon name={folderViews[folder.id]?.icon} />}
              count={
                sidebar.showCounts
                  ? (counts.folders[folder.id] ?? 0)
                  : undefined
              }
              active={
                libraryPage && nav.kind === "folder" && nav.id === folder.id
              }
              onClick={() => void openQuickFolder(folder)}
            />
          ))}
        </Sidebar.Group>
      ) : null}
      <Sidebar.CollapsibleGroup
        open={foldersOpen}
        onOpenChange={setFoldersOpen}
      >
        <SpecContextMenu
          buildItems={() => folderGroupMenuItems(tree.sort, tree.setSort)}
        >
          <Sidebar.GroupHeader>
            <Sidebar.CollapsibleGroupLabel>
              Folders
            </Sidebar.CollapsibleGroupLabel>
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
        </SpecContextMenu>
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
            return (
              <FolderTreeRow
                key={folder.id}
                collapsed={tree.collapsed.has(folder.id)}
                count={
                  sidebar.showCounts ? (counts.folders[folder.id] ?? 0) : 0
                }
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
                hasChildren={tree.parentIds.has(folder.id)}
                includeSubfolders={includeThisFolder}
                nav={nav}
                quickAccess={presentation?.quickAccess ?? false}
                sameLevelHasChildren={folderRows.some(
                  (row) =>
                    row.parentId === folder.parentId &&
                    tree.parentIds.has(row.id),
                )}
                viewing={viewing}
                dragHandlers={drag.handlersFor(folder)}
                dragging={drag.draggingFolderId === folder.id}
                coverSaveId={presentation?.coverSaveId}
                onCreateFolder={(parentId) => void createFolder(parentId)}
                onCustomize={() => setCustomizingFolderId(folder.id)}
                onFinishEditing={() =>
                  setEditingFolderId((id) => (id === folder.id ? null : id))
                }
                onOpenTool={setFolderTool}
                onStartEditing={setEditingFolderId}
                onToggleAll={tree.toggleAllFolders}
                onToggleFolder={() => tree.toggleFolder(folder.id)}
                doubleClickBehavior={sidebar.doubleClickBehavior}
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
      {customizingFolder ? (
        <FolderCustomizeDialog
          key={customizingFolder.id}
          folder={customizingFolder}
          folderIcon={folderViews[customizingFolder.id]?.icon}
          onClose={() => setCustomizingFolderId(null)}
        />
      ) : null}
      {quickUnlock ? (
        <FolderUnlockDialog
          folderId={quickUnlock.folderId}
          folderName={quickUnlock.name}
          hint={quickUnlock.hint}
          onClose={() => setQuickUnlock(null)}
          onUnlocked={() => {
            const selectedId = quickUnlock.selectedId;
            const name = quickUnlock.name;
            setQuickUnlock(null);
            void enterFolder(selectedId, (request) =>
              setQuickUnlock({
                folderId: request.unlockId,
                selectedId,
                name,
                hint: request.hint,
              }),
            );
          }}
        />
      ) : null}
    </>
  );
}
