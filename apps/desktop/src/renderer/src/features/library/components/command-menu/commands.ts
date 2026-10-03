import {
  IconAlbum2Outline18,
  IconArrowDiagonalInOutline18,
  IconBookmarkOutline18,
  IconBookmarkSlashOutline18,
  IconChatBubblePenOutline18,
  IconClone2Outline18,
  IconDownloadOutline18,
  IconEyeOutline18,
  IconFileOutline18,
  IconFolderBanOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconGear3Outline18,
  IconTrashXmarkOutline18,
  IconVersionsOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import {
  importClipboard,
  importEagle,
  importPaths,
  newFolder,
  newTag,
  runNewAction,
} from "@/features/library/components/new-menu/actions";
import { openHarvester } from "@/features/library/lib/open-harvester";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { resetFilters } from "@/features/library/state/view-store";
import { openSettings } from "@/features/settings/lib/open-settings";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import { getAppRouter } from "@/shared/lib/app-router";
import type { CommandSpec } from "./types";

export function navigateTo(path: string): void {
  getAppRouter()?.history.push(path);
}

export const COMMANDS: readonly CommandSpec[] = [
  {
    id: "new-folder",
    group: "Create",
    label: "New Folder",
    icon: IconFolderOutline18,
    keywords: "create collection organize directory",
    shortcut: "library.new-folder",
    run: () => newFolder(),
  },
  {
    id: "new-tag",
    group: "Create",
    label: "New Tag",
    icon: IconBookmarkOutline18,
    keywords: "create label organize",
    shortcut: "library.new-tag",
    run: () => newTag("tag"),
  },
  {
    id: "new-tag-group",
    group: "Create",
    label: "New Tag Group",
    icon: IconVersionsOutline18,
    keywords: "create labels organize",
    shortcut: "library.new-tag-group",
    run: () => newTag("tag-group"),
  },
  {
    id: "new-source",
    group: "Create",
    label: "New Source",
    icon: IconArrowDiagonalInOutline18,
    keywords: "connect watch folder add account",
    shortcut: "sources.new",
    run: () =>
      openHarvester({
        section: "sources",
        intent: { type: "new-source" },
      }),
  },
  {
    id: "new-watch",
    group: "Create",
    label: "New Watch",
    icon: IconEyeOutline18,
    keywords: "source public account follow import watch",
    run: () =>
      openHarvester({
        section: "sources",
        intent: { type: "new-source" },
      }),
  },
  {
    id: "watched-folder",
    group: "Create",
    label: "New Watched Folder",
    icon: IconFolderOpenOutline18,
    keywords: "auto import directory files copy local",
    run: () => void runNewAction(pickWatchedFolder),
  },
  {
    id: "import-files",
    group: "Import",
    label: "Import Files",
    icon: IconFileOutline18,
    keywords: "image video audio pdf document media",
    shortcut: "library.import-files",
    run: () => void runNewAction(() => importPaths("files")),
  },
  {
    id: "import-folders",
    group: "Import",
    label: "Import Folders",
    icon: IconFolderOpenOutline18,
    keywords: "directory files media",
    shortcut: "library.import-folders",
    run: () => void runNewAction(() => importPaths("folders")),
  },
  {
    id: "import-clipboard",
    group: "Import",
    label: "Import from Clipboard",
    icon: IconClone2Outline18,
    keywords: "paste image files",
    run: () => void runNewAction(importClipboard),
  },
  {
    id: "import-eagle",
    group: "Import",
    label: "Import Eagle Library",
    icon: IconDownloadOutline18,
    keywords: "migrate archive package",
    run: () => void runNewAction(importEagle),
  },
  {
    id: "library",
    group: "Navigate",
    label: "Library",
    detail: "All saves",
    icon: IconAlbum2Outline18,
    keywords: "home saves archive",
    shortcut: "nav.library",
    run: () => {
      resetFilters();
      libraryChrome.setNav({ kind: "all" });
      navigateTo("/");
    },
  },
  {
    id: "uncategorized",
    group: "Navigate",
    label: "Uncategorized",
    detail: "Saves that aren't in a folder",
    icon: IconFolderBanOutline18,
    keywords: "unfiled inbox no folder",
    run: () => {
      resetFilters();
      libraryChrome.setNav({ kind: "uncategorized" });
      navigateTo("/");
    },
  },
  {
    id: "untagged",
    group: "Navigate",
    label: "Untagged",
    detail: "Saves without tags",
    icon: IconBookmarkSlashOutline18,
    keywords: "no tags labels",
    run: () => {
      resetFilters();
      libraryChrome.setNav({ kind: "all" });
      navigateTo("/untagged");
    },
  },
  {
    id: "sources",
    group: "Navigate",
    label: "Sources",
    detail: "Connected accounts and watches",
    icon: IconArrowDiagonalInOutline18,
    keywords: "accounts connect watches",
    shortcut: "nav.sources",
    run: () => openHarvester({ section: "sources" }),
  },
  {
    id: "downloads",
    group: "Navigate",
    label: "Downloads",
    detail: "Active and recent transfers",
    icon: IconWindowDownloadOutline18,
    keywords: "transfers queue",
    shortcut: "nav.downloads",
    run: () => openHarvester({ section: "downloads" }),
  },
  {
    id: "tags",
    group: "Navigate",
    label: "Tags",
    detail: "Organize your library",
    icon: IconBookmarkOutline18,
    keywords: "labels organize",
    run: () => navigateTo("/tags"),
  },
  {
    id: "assistant",
    group: "Navigate",
    label: "Assistant",
    detail: "Ask your library",
    icon: IconChatBubblePenOutline18,
    keywords: "ask chat ai",
    run: () => navigateTo("/assistant"),
  },
  {
    id: "trash",
    group: "Navigate",
    label: "Trash",
    detail: "Recently deleted saves",
    icon: IconTrashXmarkOutline18,
    keywords: "deleted bin",
    shortcut: "nav.trash",
    run: () => {
      libraryChrome.setNav({ kind: "trash" });
      navigateTo("/trash");
    },
  },
  {
    id: "settings",
    group: "App",
    label: "Open Settings",
    detail: "Preferences, storage, and AI",
    icon: IconGear3Outline18,
    keywords: "preferences configuration",
    shortcut: "app.settings",
    run: () => openSettings(),
  },
];
