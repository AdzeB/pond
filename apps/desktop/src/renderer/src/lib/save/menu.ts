import type { MenuItemSpec } from "@pond/ui";
import { deriveTypeKind } from "@/lib/media/units";
import {
  copyableImageIndex,
  copyFile as copyFileAction,
  copyFilePath,
  copyImage as copyImageAction,
  copyTags as copyTagsAction,
  copyUrl,
  exportFile as exportFileAction,
  openDefaultApp,
  openInBrowser,
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
  copyTagsForSelection,
  copyUrlsForSelection,
  deleteSelectionForever,
  exportSelectionFiles,
  openDefaultAppForSelection,
  openInBrowserForSelection,
  pasteTagsForSelection,
  refreshDetailsForSelection,
  restoreSelection,
  revealFilesForSelection,
  reverseImageSearchForSelection,
  trashSelection,
} from "@/lib/save/selection";
import { shortcutGlyphs } from "@/lib/save/shortcuts";
import type { Save } from "@/lib/types";
import { REVEAL_LABEL } from "@/lib/ui/platform";
import { notify } from "@/lib/ui/toast";
import { pool } from "@/stores/pool";
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

export function buildSaveMenu(
  saveOrSaves: Save | readonly Save[],
  { clipboardEmpty, fileIndex = null }: BuildSaveMenuOptions,
): MenuItemSpec[] {
  const saves = Array.isArray(saveOrSaves) ? saveOrSaves : [saveOrSaves];
  const save = saves[0];
  if (!save) return [];
  const ids = saves.map((s) => s.id);
  const batch = saves.length > 1;
  const hasFiles = saves.some((s) => s.files.length > 0);
  const hasTags = saves.some((s) => s.tags.length > 0);
  const allTrashed = saves.every((s) => Boolean(s.deletedAt));
  const hasUrl = saves.some((s) => Boolean(s.url));
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

  return [
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
      onClick: () => {
        if (batch) void revealFilesForSelection(ids);
        else void revealFile(save, fileIndex);
      },
    },
    { type: "separator" },
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
      label: "Reverse Image Search",
      hidden: !hasUrl,
      items: reverseSearchItems,
    },
    {
      label: "Export",
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.export"),
      onClick: () => {
        if (batch) void exportSelectionFiles(ids);
        else void exportFileAction(save, fileIndex);
      },
    },
    { type: "separator" },
    ...restoreItems,
    { type: "separator" },
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
    batch
      ? {
          label: "Open Original URL in Browser",
          hidden: !hasUrl,
          onClick: () => void openInBrowserForSelection(ids),
        }
      : {
          type: "link",
          label: "Open Original URL in Browser",
          hidden: !hasUrl,
          href: save.url ?? "",
          onClick: () => void openInBrowser(save),
        },
  ];
}

function notifyCopy(result: { ok: boolean; message: string }): void {
  if (!result.ok) return;
  notify({ id: "copy-selection", title: result.message });
}
