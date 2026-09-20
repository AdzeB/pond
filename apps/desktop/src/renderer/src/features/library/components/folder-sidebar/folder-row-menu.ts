import type { Folder } from "@pond/schema/db";
import { libraryFolderLink } from "@shared/library-links";
import {
  buildFolderMenuItems,
  confirmRemoveFolder,
  copyFolderToLibrary,
  duplicateFolder,
  exportFolderCsv,
  exportFolderEaglePackage,
  exportFolderFiles,
  exportFolderPackage,
} from "@/features/library/components/folder-context-menu/folder-context-menu";
import type { FolderTool } from "@/features/library/components/folder-tools";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import { folders } from "@/features/library/state/folders";
import type { LibraryNav } from "@/features/library/state/library-chrome";
import { openOrganizationRenameDialog } from "@/features/library/state/organization-rename-dialog";
import { setIncludeSubfolders } from "@/features/library/state/view-store";
import { notify } from "@/shared/lib/toast";
import type { FolderIconId } from "./folder-icons";
import { selectLibraryNav } from "./navigation";

interface FolderRowMenuInput {
  collapsed: boolean;
  creating: boolean;
  exportIds: string[];
  folder: Folder;
  folderIcon?: FolderIconId;
  hasChildren: boolean;
  includeSubfolders: boolean;
  quickAccess?: boolean;
  nav: LibraryNav;
  sameLevelHasChildren: boolean;
  viewing: boolean;
  onCreateFolder: (parentId?: string) => void;
  onCustomize: () => void;
  onOpenTool: (tool: FolderTool) => void;
  onStartEditing: (id: string) => void;
  onToggleAll: () => void;
  onToggleFolder: () => void;
  onToggleSameLevel: (expanded: boolean) => void;
}

export function buildFolderRowMenuItems(input: FolderRowMenuInput) {
  const { folder } = input;
  const items = buildFolderMenuItems({
    hasChildren: input.hasChildren,
    sameLevelHasChildren: input.sameLevelHasChildren,
    includeSubfolders: input.includeSubfolders,
    creating: input.creating,
    onNewFolder: () => input.onCreateFolder(folder.parentId ?? undefined),
    onNewSubfolder: () => input.onCreateFolder(folder.id),
    onMove: () =>
      input.onOpenTool({ kind: "move", id: folder.id, name: folder.name }),
    onRename: () => input.onStartEditing(folder.id),
    onBatchRename: () => openOrganizationRenameDialog("folders", folder.id),
    onAutoTag: () =>
      input.onOpenTool({ kind: "tags", id: folder.id, name: folder.name }),
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
    onExportEaglePackage: () => void exportFolderEaglePackage(input.exportIds),
    onExportPackage: () => void exportFolderPackage(input.exportIds),
    onCopyToLibrary: () => void copyFolderToLibrary(input.exportIds),
    onCopyLink: () => {
      void window.pond
        .query("clipboard.writeText", {
          text: libraryFolderLink(window.pond.pondId(), folder.id),
        })
        .then(() => notify({ id: "folder-link", title: "Folder link copied" }));
    },
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
    onCustomize: input.onCustomize,
    onRemove: () => {
      window.setTimeout(
        () =>
          confirmRemoveFolder({
            id: folder.id,
            onRemoved: async () => {
              await folders.refresh();
              if (input.nav.kind === "folder" && input.nav.id === folder.id) {
                selectLibraryNav({ kind: "all" });
              }
            },
          }),
        0,
      );
    },
  });
  const customizeIndex = items.findIndex(
    (item) => "label" in item && item.label === "Customize Folder",
  );
  items.splice(Math.max(0, customizeIndex), 0, {
    type: "checkbox",
    label: "Quick Access",
    checked: input.quickAccess ?? false,
    onCheckedChange: (quickAccess) => {
      void saveFolderPresentation(folder.id, { quickAccess }).catch(() =>
        notify({
          id: "folder-quick-access",
          title: "Couldn't update Quick Access",
        }),
      );
    },
  });
  return items;
}
