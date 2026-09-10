import {
  IconClone2Outline18,
  IconDownloadOutline18,
  IconFileOutline18,
  IconFolderImportOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconFolderSearchOutline18,
  IconGlobeOutline18,
  IconImageOutline18,
  IconLink2Outline18,
} from "@pond/icons/outline/18";
import { Dialog, type MenuItemSpec } from "@pond/ui";
import {
  importBookmarks,
  importClipboard,
  importEagle,
  importPageAssets,
  importPaths,
  importPondPackage,
  newFolder,
  runNewAction,
} from "@/features/library/components/new-menu/actions";
import { newMenuDialog } from "@/features/library/state/new-menu-dialog";
import { savedViews } from "@/features/library/state/saved-views";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";

export function buildEmptyGalleryMenu(): MenuItemSpec[] {
  return [
    {
      label: "New Folder",
      icon: <IconFolderOutline18 />,
      shortcut: shortcutGlyphs("library.new-folder"),
      onClick: () => newFolder(),
    },
    {
      label: "New Smart Folder",
      icon: <IconFolderSearchOutline18 />,
      onClick: () => {
        Dialog.prompt({
          title: "New Smart Folder",
          initialValue: "Untitled",
          confirmLabel: "Create",
          onConfirm: async (name) => {
            await savedViews.create({ name, kind: "smart_folder" });
          },
        });
      },
    },
    { type: "separator" },
    {
      label: "Import Files",
      icon: <IconFileOutline18 />,
      shortcut: shortcutGlyphs("library.import-files"),
      onClick: () => void runNewAction(() => importPaths("files")),
    },
    {
      label: "Import Folders",
      icon: <IconFolderOpenOutline18 />,
      shortcut: shortcutGlyphs("library.import-folders"),
      onClick: () => void runNewAction(() => importPaths("folders")),
    },
    {
      label: "Import from Links",
      icon: <IconLink2Outline18 />,
      shortcut: shortcutGlyphs("library.import-links"),
      onClick: () => newMenuDialog.open("links"),
    },
    {
      label: "Import Pond Package",
      icon: <IconFolderImportOutline18 />,
      onClick: () => void runNewAction(importPondPackage),
    },
    {
      label: "Watched Folder",
      icon: <IconFolderOpenOutline18 />,
      onClick: () => void runNewAction(pickWatchedFolder),
    },
    {
      label: "Import Eagle Library",
      icon: <IconDownloadOutline18 />,
      onClick: () => void runNewAction(importEagle),
    },
    { type: "separator" },
    {
      label: "Import from Clipboard",
      icon: <IconClone2Outline18 />,
      onClick: () => void runNewAction(importClipboard),
    },
    {
      label: "Import Bookmarks",
      icon: <IconGlobeOutline18 />,
      onClick: () => void runNewAction(importBookmarks),
    },
    {
      label: "Import Page Assets",
      icon: <IconImageOutline18 />,
      onClick: () => {
        Dialog.prompt({
          title: "Import Page Assets",
          confirmLabel: "Import",
          placeholder: "https://",
          onConfirm: (url) => void runNewAction(() => importPageAssets(url)),
        });
      },
    },
  ];
}
