import {
  IconArchiveExportOutline18,
  IconBulletListOutline18,
  IconClone2Outline18,
  IconEyeOutline18,
  IconFaceSmileOutline18,
  IconFolderBoltOutline18,
  IconFolderDotsOutline18,
  IconFolderImportOutline18,
  IconFolderPenOutline18,
  IconFolderPlusOutline18,
  IconFolderSendOutline18,
  IconFoldersOutline18,
  IconFolderTreeOutline18,
  IconFolderXmarkOutline18,
} from "@pond/icons/outline/18";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { Dialog, type MenuItemSpec } from "@pond/ui";
import type { ReactElement } from "react";
import { descendantFolderIds } from "@/features/library/components/folder-sidebar/tree";
import {
  exportSelectionCsv,
  exportSelectionFiles,
} from "@/features/saves/lib/selection";
import { emitFeedback } from "@/features/settings/lib/sounds";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";

export interface FolderMenuActions {
  hasChildren: boolean;
  sameLevelHasChildren: boolean;
  includeSubfolders: boolean;
  creating: boolean;
  onNewFolder: () => void;
  onNewSubfolder: () => void;
  onMove: () => void;
  onRename: () => void;
  onBatchRename?: () => void;
  onAutoTag: () => void;
  onToggleFolder: () => void;
  onToggleSameLevel: () => void;
  onToggleAll: () => void;
  onDuplicate: () => void;
  onExportFiles: () => void;
  onExportCsv: () => void;
  onExportEaglePackage: () => void;
  onExportPackage: () => void;
  onCopyToLibrary: () => void;
  onCopyLink?: () => void;
  onToggleSubfolders: (next: boolean) => void;
  onCustomize: () => void;
  onRemove: () => void;
}

export function buildFolderMenuItems(a: FolderMenuActions): MenuItemSpec[] {
  return [
    {
      label: "New Folder",
      icon: <IconFolderPlusOutline18 />,
      shortcut: shortcutGlyphs("library.new-folder"),
      disabled: a.creating,
      onClick: a.onNewFolder,
    },
    {
      label: "New Subfolder",
      icon: <IconFoldersOutline18 />,
      disabled: a.creating,
      onClick: a.onNewSubfolder,
    },
    {
      label: "Move Folder",
      icon: <IconFolderSendOutline18 />,
      onClick: a.onMove,
    },
    { type: "separator" },
    {
      label: "Rename",
      icon: <IconFolderPenOutline18 />,
      onClick: a.onRename,
    },
    {
      label: "Batch Rename Folders",
      icon: <IconFolderPenOutline18 />,
      onClick: a.onBatchRename,
    },
    {
      label: "Set Auto-Tag",
      icon: <IconFolderBoltOutline18 />,
      onClick: a.onAutoTag,
    },
    { type: "separator" },
    {
      label: "Expand/Collapse Folder",
      icon: <IconBulletListOutline18 />,
      disabled: !a.hasChildren,
      onClick: a.onToggleFolder,
    },
    {
      label: "Expand/Collapse Same Level Folders",
      icon: <IconFolderDotsOutline18 />,
      disabled: !a.sameLevelHasChildren,
      onClick: a.onToggleSameLevel,
    },
    {
      label: "Expand/Collapse All Folders",
      icon: <IconFolderTreeOutline18 />,
      onClick: a.onToggleAll,
    },
    { type: "separator" },
    {
      label: "Duplicate",
      icon: <IconClone2Outline18 />,
      disabled: a.creating,
      onClick: a.onDuplicate,
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Export",
      icon: <IconArchiveExportOutline18 />,
      items: [
        { label: "Export Files", keywords: "files", onClick: a.onExportFiles },
        { label: "Export to CSV", keywords: "csv", onClick: a.onExportCsv },
        {
          label: "Export Eagle Package",
          keywords: "eagle package",
          onClick: a.onExportEaglePackage,
        },
        {
          label: "Export Pond Package",
          keywords: "package",
          onClick: a.onExportPackage,
        },
      ],
    },
    {
      label: "Add to Other Library",
      icon: <IconFolderImportOutline18 />,
      onClick: a.onCopyToLibrary,
    },
    {
      label: "Copy Folder Link",
      onClick: a.onCopyLink,
      disabled: !a.onCopyLink,
    },
    { type: "separator" },
    {
      type: "checkbox",
      label: "Show Subfolder Content",
      icon: <IconEyeOutline18 />,
      indicator: "check",
      checked: a.includeSubfolders,
      onCheckedChange: a.onToggleSubfolders,
    },
    { type: "separator" },
    {
      label: "Customize Folder",
      icon: <IconFaceSmileOutline18 />,
      onClick: a.onCustomize,
    },
    { type: "separator" },
    {
      label: "Remove Folder",
      icon: <IconFolderXmarkOutline18 />,
      variant: "destructive",
      onClick: a.onRemove,
    },
  ];
}

export async function duplicateFolder(folder: {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
}): Promise<string> {
  const copy = await window.pond.query("folders.create", {
    name: `${folder.name} Copy`,
    parentId: folder.parentId,
    color: folder.color,
  });
  const ids = await folderSaveIds([folder.id]);
  if (ids.length) {
    await window.pond.query("folders.addSaves", {
      folderId: copy.id,
      saveIds: ids,
    });
  }
  return copy.id;
}

export function folderIdsForExport(
  folderId: string,
  folders: ReadonlyArray<{ id: string; parentId: string | null }>,
  includeSubfolders: boolean,
): string[] {
  return includeSubfolders
    ? descendantFolderIds(folderId, folders)
    : [folderId];
}

async function folderSaveIds(folderIds: string[]): Promise<string[]> {
  const result = await window.pond.query("saves.queryIds", {
    query: EMPTY_QUERY,
    scope: { folderIds },
  });
  return result.ids;
}

async function withFolderSaves(
  folderIds: string[],
  run: (ids: string[]) => Promise<void>,
): Promise<void> {
  const ids = await folderSaveIds(folderIds);
  if (!ids.length) {
    notify({
      id: "folder-saves",
      title: "This folder has no Saves.",
    });
    return;
  }
  await run(ids);
}

export async function exportFolderFiles(folderIds: string[]): Promise<void> {
  await withFolderSaves(folderIds, async (ids) => {
    const result = await exportSelectionFiles(ids);
    if (!result.ok) notify({ id: "folder-export", title: result.message });
  });
}

export async function exportFolderCsv(folderIds: string[]): Promise<void> {
  await withFolderSaves(folderIds, async (ids) => {
    const result = await exportSelectionCsv(ids);
    if (!result.ok) notify({ id: "folder-export", title: result.message });
  });
}

export async function exportFolderPackage(folderIds: string[]): Promise<void> {
  await withFolderSaves(folderIds, async (ids) => {
    const result = await window.pond.query("saves.exportPackage", { ids });
    if (!result.ok && result.error === "password_required") {
      Dialog.prompt({
        title: "Protect Pond Package",
        description:
          "Enter a password for this export. Pond will show a separate recovery key after export.",
        inputType: "password",
        autoComplete: "new-password",
        confirmLabel: "Export",
        onConfirm: async (password) => {
          if (password.length < 8)
            throw new Error("Use at least 8 characters.");
          const protectedResult = await window.pond.query(
            "saves.exportPackage",
            { ids, password },
          );
          if (!protectedResult.ok)
            throw new Error(
              protectedResult.error || "Couldn't export package.",
            );
          if (protectedResult.recoveryKey) {
            Dialog.confirm({
              title: "Package Recovery Key",
              description: protectedResult.recoveryKey,
              confirmLabel: "Copy Recovery Key",
              cancelLabel: "Done",
              onConfirm: async () => {
                await window.pond.query("clipboard.writeText", {
                  text: protectedResult.recoveryKey ?? "",
                });
              },
            });
          }
        },
      });
      return;
    }
    if (!result.ok && result.error !== "canceled")
      notify({
        id: "folder-export",
        title: result.error || "Couldn't export package.",
      });
    else if (result.ok)
      notify({ id: "folder-export", title: "Pond package exported" });
  });
}

export async function exportFolderEaglePackage(
  folderIds: string[],
): Promise<void> {
  await withFolderSaves(folderIds, async (ids) => {
    const result = await window.pond.query("saves.exportEaglePackage", { ids });
    if (!result.ok && result.error !== "canceled")
      notify({
        id: "folder-export",
        title: result.error || "Couldn't export Eagle package.",
      });
    else if (result.ok)
      notify({ id: "folder-export", title: "Eagle package exported" });
  });
}

export async function copyFolderToLibrary(folderIds: string[]): Promise<void> {
  await withFolderSaves(folderIds, async (ids) => {
    try {
      const result = await window.pond.query("saves.copyToLibrary", { ids });
      if (result.ok)
        notify({
          id: "folder-copy",
          title: "Saves copied to library",
          description: `${result.imported ?? 0} copied, ${result.skipped ?? 0} already in this library.`,
        });
      else if (result.error !== "canceled")
        notify({
          id: "folder-copy",
          title: result.error || "Couldn't copy Saves.",
        });
    } catch {
      notify({ id: "folder-copy", title: "Couldn't copy Saves." });
    }
  });
}

export function confirmRemoveFolder(input: {
  id: string;
  onRemoved: () => void | Promise<void>;
}): void {
  Dialog.confirm({
    title: "Remove Folder",
    description:
      "Saves stay in the Library and move to Uncategorized unless you select the option below.",
    confirmLabel: "Remove",
    confirmVariant: "destructive",
    checkbox: {
      label: "Move Saves in this folder and its subfolders to Trash",
    },
    onConfirm: async ({ checked }) => {
      await window.pond.query("folders.delete", {
        id: input.id,
        trashContainedSaves: checked,
      });
      emitFeedback("folderDeletion");
      await input.onRemoved();
    },
  });
}

interface FolderContextMenuProps {
  buildItems: () => MenuItemSpec[];
  children: ReactElement;
}

export function FolderContextMenu({
  buildItems,
  children,
}: FolderContextMenuProps) {
  return (
    <SpecContextMenu
      search
      searchLabel="Search folder operations"
      minWidth="280px"
      buildItems={buildItems}
    >
      {children}
    </SpecContextMenu>
  );
}
