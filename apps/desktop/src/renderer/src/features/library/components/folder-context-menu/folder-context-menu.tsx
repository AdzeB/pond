import {
  IconArchiveExportOutline18,
  IconBulletListOutline18,
  IconCopyOutline18,
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
  IconSortArrowsOutline18,
} from "@pond/icons/outline/18";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { cssVars, Dialog, type MenuItemSpec } from "@pond/ui";
import type { ReactElement } from "react";
import {
  FOLDER_ICONS,
  FOLDER_SWATCHES,
  type FolderIconId,
} from "@/features/library/components/folder-sidebar/folder-icons";
import { descendantFolderIds } from "@/features/library/components/folder-sidebar/tree";
import type { SortKey } from "@/features/library/hooks/use-filtered-saves";
import {
  exportSelectionCsv,
  exportSelectionFiles,
} from "@/features/saves/lib/selection";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import styles from "./styles.module.css";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "savedAt", label: "Date Saved" },
  { value: "createdAt", label: "Date Added" },
  { value: "publishedAt", label: "Date Published" },
  { value: "title", label: "Title" },
  { value: "type", label: "Type" },
  { value: "creator", label: "Creator" },
  { value: "rating", label: "Rating" },
  { value: "manual", label: "Manual" },
  { value: "random", label: "Random" },
];

export interface FolderMenuActions {
  hasChildren: boolean;
  sameLevelHasChildren: boolean;
  includeSubfolders: boolean;
  color: string | null;
  sortKey: string;
  creating: boolean;
  onNewFolder: () => void;
  onNewSubfolder: () => void;
  onMove: () => void;
  onRename: () => void;
  onAutoTag: () => void;
  onSort: (key: SortKey) => void;
  onToggleFolder: () => void;
  onToggleSameLevel: () => void;
  onToggleAll: () => void;
  onDuplicate: () => void;
  onExportFiles: () => void;
  onExportCsv: () => void;
  onExportPackage: () => void;
  onCopyToLibrary: () => void;
  onToggleSubfolders: (next: boolean) => void;
  onChangeIcon: (id: FolderIconId) => void;
  onChangeColor: (color: string | null) => void;
  onRemove: () => void;
}

function ColorSwatches({
  color,
  onChange,
}: {
  color: string | null;
  onChange: (color: string | null) => void;
}) {
  return (
    <fieldset className={styles.palette} aria-label="Folder Color">
      {FOLDER_SWATCHES.map((swatch) => (
        <button
          key={swatch.label}
          type="button"
          className={styles.swatch}
          aria-label={swatch.label}
          aria-pressed={swatch.id === color}
          data-selected={swatch.id === color || undefined}
          style={cssVars({ "--swatch": swatch.css })}
          onClick={() => onChange(swatch.id)}
        />
      ))}
    </fieldset>
  );
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
      label: "Set Auto-Tag",
      icon: <IconFolderBoltOutline18 />,
      onClick: a.onAutoTag,
    },
    {
      type: "submenu",
      label: "Sort By",
      icon: <IconSortArrowsOutline18 />,
      items: SORT_OPTIONS.map((option) => ({
        type: "checkbox" as const,
        label: option.label,
        checked: a.sortKey === option.value,
        onCheckedChange: () => a.onSort(option.value),
      })),
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
      icon: <IconCopyOutline18 />,
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
    { type: "separator" },
    {
      type: "checkbox",
      label: "Show Subfolder Content",
      icon: <IconEyeOutline18 />,
      checked: a.includeSubfolders,
      onCheckedChange: a.onToggleSubfolders,
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Change Icon",
      icon: <IconFaceSmileOutline18 />,
      items: FOLDER_ICONS.map(({ id, label, Icon }) => ({
        label,
        icon: <Icon />,
        onClick: () => a.onChangeIcon(id),
      })),
    },
    {
      type: "custom",
      render: () => (
        <ColorSwatches color={a.color} onChange={a.onChangeColor} />
      ),
    },
    { type: "separator" },
    {
      label: "Remove Folder",
      icon: <IconFolderXmarkOutline18 />,
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
    if (!result.ok && result.error !== "canceled")
      notify({
        id: "folder-export",
        title: result.error || "Couldn't export package.",
      });
    else if (result.ok)
      notify({ id: "folder-export", title: "Pond package exported" });
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
    description: "Saves stay in the library. They move to Uncategorized.",
    confirmLabel: "Remove",
    confirmVariant: "destructive",
    onConfirm: async () => {
      await window.pond.query("folders.delete", { id: input.id });
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
