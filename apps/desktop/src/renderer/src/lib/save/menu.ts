import type { MenuItemSpec } from "@pond/ui";
import { confirm } from "@/components/shared/confirm-dialog";
import { prompt } from "@/components/shared/prompt-dialog";
import { deriveTypeKind } from "@/lib/media/units";
import {
  copyableImageIndex,
  copyFile as copyFileAction,
  copyFilePath,
  copyId,
  copyImage as copyImageAction,
  copyTags as copyTagsAction,
  copyUrl,
  exportFile as exportFileAction,
  focusPaneTitle,
  openDefaultApp,
  openInBrowser,
  openTagPicker,
  pasteTags as pasteTagsAction,
  resolveFileIndex,
  revealFile,
} from "@/lib/save/actions";
import { purgeSave, trashSave, untrashSave } from "@/lib/save/mutate";
import {
  REVERSE_SEARCH_ENGINES,
  reverseImageSearch,
} from "@/lib/save/reverse-image-search";
import {
  archiveSitesForSelection,
  copyFilePathsForSelection,
  copyFilesForSelection,
  copyIdsForSelection,
  copyTagsForSelection,
  copyUrlsForSelection,
  deleteSelectionForever,
  exportSelectionCsv,
  exportSelectionFiles,
  failedIdsIn,
  openDefaultAppForSelection,
  openInBrowserForSelection,
  pasteTagsForSelection,
  refreshDetailsForSelection,
  restoreSelection,
  retryFailedSelection,
  revealFilesForSelection,
  reverseImageSearchForSelection,
  trashSelection,
} from "@/lib/save/selection";
import { shortcutGlyphs } from "@/lib/save/shortcuts";
import { selectableTasks } from "@/lib/save/tasks";
import type { Save, SaveFile } from "@/lib/types";
import { REVEAL_LABEL } from "@/lib/ui/platform";
import { openSave } from "@/lib/ui/save-nav";
import { notify } from "@/lib/ui/toast";
import { dockMode } from "@/stores/dock-mode";
import { folders } from "@/stores/folders";
import { inspect } from "@/stores/inspect";
import { pool } from "@/stores/pool";
import { getPrefsSnapshot } from "@/stores/prefs";
import { selection } from "@/stores/selection";
import { tumbleToTrash } from "@/stores/trash-tumble";

interface BuildSaveMenuOptions {
  clipboardEmpty: boolean;
  fileIndex?: number | null;
}

export function contextMenuSaves(clicked: Save): Save[] {
  if (selection.has(clicked.id) && selection.size() > 1) {
    const out: Save[] = [];
    for (const id of selection.snapshot()) {
      const save = pool.get(id);
      if (save) out.push(save);
    }
    if (out.length > 1) return out;
  }
  return [clicked];
}

function isHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function submenuHidden(items: MenuItemSpec[]): boolean {
  return items.every(
    (item) =>
      item.type === "separator" ||
      item.type === "custom" ||
      Boolean("hidden" in item && item.hidden),
  );
}

export function buildSaveMenu(
  saveOrSaves: Save | readonly Save[],
  { clipboardEmpty, fileIndex = null }: BuildSaveMenuOptions,
): MenuItemSpec[] {
  const saves = Array.isArray(saveOrSaves) ? saveOrSaves : [saveOrSaves];
  const save = saves[0];
  if (!save) return [];
  const ids = saves.map((s) => s.id);
  const batch = saves.length > 1;
  const hasFiles = saves.some((s) => resolveFileIndex(s) != null);
  const hasTags = saves.some((s) => s.tags.length > 0);
  const allTrashed = saves.every((s) => Boolean(s.deletedAt));
  const hasUrl = saves.some((s) => Boolean(s.url));
  const hasHttpUrl = saves.some((s) => isHttpUrl(s.url));
  const hasImage = !batch && copyableImageIndex(save, fileIndex) != null;
  const targetIndex = resolveFileIndex(save, fileIndex);
  const targetFile =
    targetIndex != null ? (save.files[targetIndex] ?? null) : null;
  const copyFileLabel =
    !batch && deriveTypeKind(targetFile, save) === "video"
      ? "Copy Video"
      : "Copy File";
  const archivable = saves.some(
    (s) => Boolean(s.url) && s.source === "web" && !s.deletedAt,
  );
  const hasCustomThumbnail =
    !batch &&
    save.files.some((file: SaveFile) => file.kind === "custom_thumbnail");
  const folderRows = folders.snapshot();
  const canRename = !batch && save.source === "local";

  const reverseSearchItems: MenuItemSpec[] = REVERSE_SEARCH_ENGINES.map(
    (engine) => ({
      label: engine.label,
      onClick: () => {
        if (batch) {
          void reverseImageSearchForSelection(ids, engine.key);
          return;
        }
        void reverseImageSearch(save, engine.key);
      },
    }),
  );

  const restoreItems: MenuItemSpec[] = allTrashed
    ? [
        {
          label: "Restore from Trash",
          shortcut: shortcutGlyphs("save.restore"),
          onClick: () => {
            if (batch) void restoreSelection(ids);
            else void untrashSave(save.id);
          },
        },
        {
          label: "Delete Forever",
          shortcut: shortcutGlyphs("save.delete-forever"),
          onClick: () => {
            if (batch) void deleteSelectionForever(ids);
            else void purgeSave(save.id);
          },
        },
      ]
    : [
        {
          label: "Move to Trash",
          shortcut: shortcutGlyphs("save.trash"),
          onClick: () => {
            if (batch) {
              const liveIds = saves
                .filter((s) => !s.deletedAt)
                .map((s) => s.id);
              if (liveIds.length === 0) return;
              void tumbleToTrash(liveIds).then(() => trashSelection(liveIds));
              return;
            }
            void tumbleToTrash([save.id]).then(() => trashSave(save.id));
          },
        },
      ];

  const openItems: MenuItemSpec[] = [
    {
      label: "Open Save",
      hidden: batch,
      shortcut: shortcutGlyphs("grid.open"),
      onClick: () => openSave(save.id),
    },
    {
      label: "Pin Preview",
      hidden: batch,
      shortcut: shortcutGlyphs("view.pin-preview"),
      onClick: () => inspect.pinCurrent(),
    },
    {
      label: "Open with Default App",
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.open"),
      onClick: () => {
        if (batch) void openDefaultAppForSelection(ids);
        else void openDefaultApp(save, fileIndex);
      },
    },
    {
      label: REVEAL_LABEL,
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.reveal"),
      onClick: () => {
        if (batch) void revealFilesForSelection(ids);
        else void revealFile(save, fileIndex);
      },
    },
    batch
      ? {
          label: "Open Original URL",
          hidden: !hasHttpUrl,
          shortcut: shortcutGlyphs("save.open-url"),
          onClick: () => void openInBrowserForSelection(ids),
        }
      : {
          type: "link",
          label: "Open Original URL",
          hidden: !hasHttpUrl,
          shortcut: shortcutGlyphs("save.open-url"),
          href: save.url ?? "",
          onClick: () => void openInBrowser(save),
        },
  ];

  const copyItems: MenuItemSpec[] = [
    {
      label: "Copy Image",
      hidden: !hasImage,
      shortcut: shortcutGlyphs("save.copy-image"),
      onClick: () => void copyImageAction(save, fileIndex),
    },
    {
      label: copyFileLabel,
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.copy-image"),
      onClick: () => {
        if (batch) void copyFilesForSelection(ids);
        else void copyFileAction(save, fileIndex);
      },
    },
    {
      label: "Copy URL",
      hidden: !hasUrl,
      shortcut: shortcutGlyphs("save.copy-url"),
      onClick: () => {
        if (batch) {
          void copyUrlsForSelection(ids).then(notifyCopy);
          return;
        }
        if (save.url) void copyUrl(save.url);
      },
    },
    {
      label: "Copy File Path",
      hidden: !hasFiles,
      onClick: () => {
        if (batch) {
          void copyFilePathsForSelection(ids).then(notifyCopy);
          return;
        }
        void copyFilePath(save, fileIndex);
      },
    },
    {
      label: "Copy Tags",
      hidden: !hasTags,
      shortcut: shortcutGlyphs("save.copy-tags"),
      onClick: () => {
        if (batch) copyTagsForSelection(ids);
        else copyTagsAction(save);
      },
    },
    {
      label: "Copy Save ID",
      shortcut: shortcutGlyphs("save.copy-id"),
      onClick: () => {
        if (batch) {
          void copyIdsForSelection(ids).then(notifyCopy);
          return;
        }
        void copyId(save.id);
      },
    },
  ];

  const addItems: MenuItemSpec[] = [
    {
      label: "Add Tag",
      shortcut: shortcutGlyphs("save.add-tag"),
      onClick: () => {
        if (batch) {
          dockMode.open("selection-tag");
          return;
        }
        openTagPicker();
      },
    },
    {
      type: "submenu",
      label: "Add to Folder",
      hidden: folderRows.length === 0,
      items: folderRows.map((folder) => ({
        label: folder.name,
        onClick: () => {
          void window.pond
            .query("folders.addSaves", {
              folderId: folder.id,
              saveIds: ids,
            })
            .then(() => folders.refresh());
        },
      })),
    },
  ];

  const exportItems: MenuItemSpec[] = [
    {
      label: "Export Files",
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.export"),
      onClick: () => {
        if (batch) void exportSelectionFiles(ids);
        else void exportFileAction(save, fileIndex);
      },
    },
    {
      label: "Export as WebP",
      hidden: !hasFiles,
      onClick: () => {
        void window.pond.query("saves.exportWebp", { ids });
      },
    },
    {
      label: "Export to CSV",
      onClick: () => void exportSelectionCsv(ids),
    },
  ];

  const prefs = getPrefsSnapshot();
  const runItems: MenuItemSpec[] = selectableTasks().map((task) => ({
    label: task.label,
    disabled: task.precondition?.(prefs) != null,
    onClick: () => {
      void Promise.resolve(task.run(ids));
    },
  }));
  if (failedIdsIn(ids).length > 0) {
    runItems.push({
      label: "Retry Failed",
      onClick: () => void retryFailedSelection(ids),
    });
  }

  const moreItems: MenuItemSpec[] = [
    {
      label: "Set Custom Thumbnail",
      hidden: batch,
      onClick: () => {
        void window.pond.query("saves.setCustomThumbnail", { id: save.id });
      },
    },
    {
      label: "Remove Custom Thumbnail",
      hidden: batch || !hasCustomThumbnail,
      onClick: () => {
        void window.pond.query("saves.removeCustomThumbnail", { id: save.id });
      },
    },
    {
      label: "Refresh Details",
      hidden: !hasUrl,
      shortcut: shortcutGlyphs("save.refresh"),
      onClick: () => {
        if (batch) {
          void refreshDetailsForSelection(ids);
          return;
        }
        if (save.url) void window.pond.refreshSave(save.id);
      },
    },
    {
      label: "Archive Full Site",
      hidden: !archivable,
      onClick: () => {
        if (batch) void archiveSitesForSelection(ids);
        else void window.pond.archiveSite(save.id);
      },
    },
  ];

  return [
    {
      type: "submenu",
      label: "Open",
      hidden: submenuHidden(openItems),
      items: openItems,
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Run",
      hidden: allTrashed || submenuHidden(runItems),
      items: runItems,
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Copy",
      hidden: submenuHidden(copyItems),
      items: copyItems,
    },
    {
      label: "Paste Tags",
      disabled: clipboardEmpty,
      shortcut: shortcutGlyphs("save.paste-tags"),
      onClick: () => {
        if (batch) void pasteTagsForSelection(ids);
        else void pasteTagsAction(save);
      },
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Add",
      hidden: submenuHidden(addItems),
      items: addItems,
    },
    {
      label: "Rename",
      hidden: !canRename,
      shortcut: shortcutGlyphs("save.rename"),
      onClick: () => focusPaneTitle(),
    },
    {
      label: "Rename Saves",
      hidden: !batch,
      onClick: () =>
        prompt({
          title: "Rename Saves",
          description: "Use {n} for a number and {title} for the current name.",
          confirmLabel: "Rename",
          initialValue: "{title} {n}",
          onConfirm: async (pattern) => {
            await window.pond.query("saves.batchRename", { ids, pattern });
          },
        }),
    },
    {
      label: "Find Duplicates",
      hidden: batch,
      onClick: () => {
        void window.pond.query("saves.findDuplicates", {}).then((raw) => {
          const groups = (raw as { groups?: Array<{ ids: string[] }> } | null)
            ?.groups;
          const match =
            groups?.find((group) => group.ids.includes(save.id)) ?? groups?.[0];
          const count = groups?.length ?? 0;
          notify({
            id: "duplicates",
            title:
              count === 0
                ? "No duplicates found"
                : `Found ${count} duplicate group${count === 1 ? "" : "s"}`,
          });
          if (match?.ids[0]) selection.set(match.ids);
        });
      },
    },
    {
      label: "Merge Duplicates",
      hidden: batch,
      onClick: () => {
        void window.pond.query("saves.findDuplicates", {}).then((raw) => {
          const groups = (raw as { groups?: Array<{ ids: string[] }> } | null)
            ?.groups;
          const group = groups?.find((item) => item.ids.includes(save.id));
          if (!group || group.ids.length < 2) {
            notify({
              id: "duplicates",
              title: "No duplicates found",
            });
            return;
          }
          const extras = group.ids.filter((id) => id !== save.id);
          confirm({
            title: "Merge Duplicates",
            description: `Keep this Save and move ${extras.length} duplicate${extras.length === 1 ? "" : "s"} to Trash.`,
            confirmLabel: "Merge",
            onConfirm: async () => {
              await window.pond.query("saves.mergeDuplicates", {
                keepId: save.id,
                ids: group.ids,
              });
            },
          });
        });
      },
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Search",
      hidden: !hasHttpUrl,
      items: reverseSearchItems,
    },
    {
      type: "submenu",
      label: "Export",
      hidden: submenuHidden(exportItems),
      items: exportItems,
    },
    ...moreItems,
    { type: "separator" },
    ...restoreItems,
  ];
}

function notifyCopy(result: { ok: boolean; message: string }): void {
  if (!result.ok) return;
  notify({ id: "copy-selection", title: result.message });
}
