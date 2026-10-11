import {
  IconClipboardOutline18,
  IconCoverOutline18,
  IconFolderPlusOutline18,
  IconFolderSendOutline18,
  IconFoldersOutline18,
  IconPencilOutline18,
  IconPinOutline18,
  IconRenameOutline18,
  IconTagPlusOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import {
  focusPaneTitle,
  openTagPicker,
  pasteTags,
} from "@/features/saves/lib/actions";
import {
  assignSavesToFolder,
  notifyUndoableFolderChange,
} from "@/features/saves/lib/folder-actions";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import { pasteTagsForSelection } from "@/features/saves/lib/selection";
import { errorCopy } from "@/shared/lib/error-copy";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import { glyph } from "./shared";
import type { SaveMenuContext } from "./types";

function buildAddItems(ids: string[], batch: boolean): MenuItemSpec[] {
  const lastFolderId = saveLibraryBridge.lastUsedFolderId();
  const lastFolder = lastFolderId
    ? (saveLibraryBridge
        .foldersSnapshot()
        .find((folder) => folder.id === lastFolderId) ?? null)
    : null;

  return [
    {
      label: "Add Tags",
      icon: glyph(IconTagPlusOutline18),
      shortcut: shortcutGlyphs("save.add-tag"),
      onClick: () => openTagPicker(),
    },
    {
      label: lastFolder
        ? `Add to "${lastFolder.name}"`
        : "Add to Last Used Folder",
      icon: glyph(IconFolderPlusOutline18),
      hidden: !lastFolder,
      shortcut: shortcutGlyphs("save.add-to-last-folder"),
      onClick: () => {
        if (lastFolder) void assignSavesToFolder(ids, lastFolder);
      },
    },
    {
      label: "Add to Folders",
      icon: glyph(IconFoldersOutline18),
      onClick: () => saveLibraryBridge.openFolderPicker(ids),
    },
    {
      label: `New Folder with ${ids.length} Saves`,
      icon: glyph(IconFolderPlusOutline18),
      hidden: !batch,
      onClick: () => {
        void (async () => {
          try {
            const folder = await window.pond.query("folders.createWithSaves", {
              name: "Untitled",
              parentId: null,
              saveIds: ids,
            });
            saveLibraryBridge.rememberFolderDestinations([folder.id]);
            await saveLibraryBridge.refreshFolders();
            saveLibraryBridge.startEditingFolder(folder.id);
            notifyUndoableFolderChange(
              "create-folder-with-saves",
              `Created "${folder.name}" with ${ids.length} saves`,
            );
          } catch (error) {
            notify({
              id: "create-folder-with-saves",
              title: "Couldn't create folder",
              description: errorCopy(error, "Try again."),
            });
          }
        })();
      },
    },
    {
      label: "Add to Other Library",
      icon: glyph(IconFolderSendOutline18),
      onClick: () => {
        void window.pond
          .query("saves.copyToLibrary", { ids })
          .then((result) => {
            if (result.ok)
              notify({
                id: "library-copy",
                title: "Saves copied to library",
                description: `${result.imported ?? 0} copied, ${result.skipped ?? 0} already in this library.`,
              });
            else if (result.reason !== "cancelled")
              notify({
                id: "library-copy",
                title: result.error || "Couldn't copy saves",
              });
          })
          .catch(() =>
            notify({ id: "library-copy", title: "Couldn't copy saves" }),
          );
      },
    },
  ];
}

export interface OrganizeMenuItems {
  destinations: MenuItemSpec[];
  editing: MenuItemSpec[];
}

export function buildOrganizeItems(
  context: SaveMenuContext,
): OrganizeMenuItems {
  const {
    save,
    ids,
    batch,
    clipboardEmpty,
    inFolder,
    isPinned,
    isCover,
    resolvedFolderId,
    resolvedPinned,
  } = context;

  return {
    destinations: buildAddItems(ids, batch),
    editing: [
      {
        label: "Rename",
        icon: glyph(IconPencilOutline18),
        hidden: !context.canRename,
        shortcut: shortcutGlyphs("save.rename"),
        onClick: () => focusPaneTitle(),
      },
      {
        label: "Rename Saves",
        icon: glyph(IconRenameOutline18),
        hidden: !batch,
        onClick: () => saveLibraryBridge.openRename(ids),
      },
      {
        label: "Paste Tags",
        icon: glyph(IconClipboardOutline18),
        disabled: clipboardEmpty,
        shortcut: shortcutGlyphs("save.paste-tags"),
        onClick: () => {
          if (batch) void pasteTagsForSelection(ids);
          else void pasteTags(save);
        },
      },
      {
        label: isPinned ? "Unpin from Top" : "Pin to Top",
        icon: glyph(IconPinOutline18),
        hidden: !inFolder || batch,
        onClick: () => {
          if (!resolvedFolderId) return;
          const next = isPinned
            ? resolvedPinned.filter((id) => id !== save.id)
            : [save.id, ...resolvedPinned.filter((id) => id !== save.id)];
          void saveLibraryBridge.saveFolderPresentation(resolvedFolderId, {
            pinnedIds: [...next],
          });
        },
      },
      {
        label: isCover ? "Remove Folder Cover" : "Set as Folder Cover",
        icon: glyph(IconCoverOutline18),
        hidden: !inFolder || batch,
        onClick: () => {
          if (!resolvedFolderId) return;
          void saveLibraryBridge.saveFolderPresentation(resolvedFolderId, {
            coverSaveId: isCover ? null : save.id,
          });
        },
      },
    ],
  };
}
