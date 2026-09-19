import type { Folder } from "@pond/schema/db";
import {
  buildFolderMenuItems,
  confirmRemoveFolder,
  copyFolderToLibrary,
  duplicateFolder,
  exportFolderCsv,
  exportFolderFiles,
  exportFolderPackage,
} from "@/features/library/components/folder-context-menu/folder-context-menu";
import type { FolderTool } from "@/features/library/components/folder-tools";
import type { SortKey } from "@/features/library/hooks/use-filtered-saves";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import { folders } from "@/features/library/state/folders";
import type { LibraryNav } from "@/features/library/state/library-chrome";
import {
  setIncludeSubfolders,
  setSort,
} from "@/features/library/state/view-store";
import { notify } from "@/shared/lib/toast";
import type { FolderIconId } from "./folder-icons";
import { selectLibraryNav } from "./navigation";

interface FolderRowMenuInput {
  collapsed: boolean;
  creating: boolean;
  exportIds: string[];
  folder: Folder;
  folderIcon?: FolderIconId;
  folderSortKey: string;
  hasChildren: boolean;
  includeSubfolders: boolean;
  nav: LibraryNav;
  sameLevelHasChildren: boolean;
  sortDir: "asc" | "desc";
  viewing: boolean;
  onCreateFolder: (parentId?: string) => void;
  onOpenTool: (tool: FolderTool) => void;
  onStartEditing: (id: string) => void;
  onToggleAll: () => void;
  onToggleFolder: () => void;
  onToggleSameLevel: (expanded: boolean) => void;
}

export function buildFolderRowMenuItems(input: FolderRowMenuInput) {
  const { folder } = input;
  return buildFolderMenuItems({
    hasChildren: input.hasChildren,
    sameLevelHasChildren: input.sameLevelHasChildren,
    includeSubfolders: input.includeSubfolders,
    color: folder.color,
    sortKey: input.folderSortKey,
    creating: input.creating,
    onNewFolder: () => input.onCreateFolder(folder.parentId ?? undefined),
    onNewSubfolder: () => input.onCreateFolder(folder.id),
    onMove: () =>
      input.onOpenTool({ kind: "move", id: folder.id, name: folder.name }),
    onRename: () => input.onStartEditing(folder.id),
    onAutoTag: () =>
      input.onOpenTool({ kind: "tags", id: folder.id, name: folder.name }),
    onSort: (key: SortKey) => {
      if (input.viewing) setSort({ key, dir: input.sortDir });
      else
        void saveFolderPresentation(folder.id, { sortKey: key }).catch(() =>
          notify({
            id: "folder-sort",
            title: "Couldn't save folder sort",
          }),
        );
    },
    onToggleFolder: input.onToggleFolder,
    onToggleSameLevel: () => input.onToggleSameLevel(!input.collapsed),
    onToggleAll: input.onToggleAll,
    onDuplicate: () => {
      void duplicateFolder(folder)
        .then(async (id) => {
          if (input.folderIcon) {
            await saveFolderPresentation(id, { icon: input.folderIcon });
          }
          await folders.refresh();
          input.onStartEditing(id);
        })
        .catch((error) =>
          notify({
            id: "folder-duplicate",
            title: "Couldn't duplicate folder",
            description: error instanceof Error ? error.message : "Try again.",
          }),
        );
    },
    onExportFiles: () => void exportFolderFiles(input.exportIds),
    onExportCsv: () => void exportFolderCsv(input.exportIds),
    onExportPackage: () => void exportFolderPackage(input.exportIds),
    onCopyToLibrary: () => void copyFolderToLibrary(input.exportIds),
    onToggleSubfolders: (next) => {
      if (input.viewing) setIncludeSubfolders(next);
      else
        void saveFolderPresentation(folder.id, {
          includeSubfolders: next,
        }).catch(() =>
          notify({
            id: "folder-subfolders",
            title: "Couldn't save subfolder setting",
          }),
        );
    },
    onChangeIcon: (id) => {
      void saveFolderPresentation(folder.id, { icon: id }).catch(() =>
        notify({
          id: "folder-icon",
          title: "Couldn't change folder icon",
        }),
      );
    },
    onChangeColor: (color) => {
      void window.pond
        .query("folders.setColor", { id: folder.id, color })
        .then(() => folders.refresh())
        .catch(() =>
          notify({
            id: "folder-color",
            title: "Couldn't change folder color",
          }),
        );
    },
    onRemove: () => {
      queueMicrotask(() =>
        confirmRemoveFolder({
          id: folder.id,
          onRemoved: async () => {
            await folders.refresh();
            if (input.nav.kind === "folder" && input.nav.id === folder.id) {
              selectLibraryNav({ kind: "all" });
            }
          },
        }),
      );
    },
  });
}
