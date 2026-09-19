import {
  IconArrowRotateClockwiseOutline18,
  IconClone2Outline18,
  IconDownloadOutline18,
  IconEyeOutline18,
  IconFileOutline18,
  IconFolderImportOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconFolderSearchOutline18,
  IconGear3Outline18,
  IconGlobeOutline18,
  IconImageOutline18,
  IconLink2Outline18,
  IconNotepadOutline18,
  IconShieldCheckOutline18,
  IconTagsOutline18,
  IconUserPlusOutline18,
  IconVersionsOutline18,
} from "@pond/icons/outline/18";
import { Dialog, type MenuItemSpec } from "@pond/ui";
import {
  BLANK_DOCUMENTS,
  type BlankDocumentKind,
} from "@shared/blank-documents";
import { Children, isValidElement, type ReactNode } from "react";
import { newMenuDialog } from "@/features/library/state/new-menu-dialog";
import { openSettings } from "@/features/settings/lib/open-settings";
import {
  connectableSourceItems,
  watchableSourceItems,
} from "@/features/sources/lib/create-menu";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import {
  createBlankDocument,
  createNote,
  findDuplicates,
  importBookmarks,
  importClipboard,
  importEagle,
  importPageAssets,
  importPaths,
  importPondPackage,
  newFolder,
  newSmartFolder,
  newSource,
  newTag,
  rescanLibrary,
  runNewAction,
  verifyIntegrity,
} from "./actions";

export function buildNewMenuItems(
  installedDocuments: readonly BlankDocumentKind[] = [],
): MenuItemSpec[] {
  const installed = new Set(installedDocuments);
  const documents: MenuItemSpec[] = [
    {
      id: "note",
      label: "New Note",
      icon: <IconNotepadOutline18 />,
      keywords: "text document write markdown",
      shortcut: shortcutGlyphs("library.new-note"),
      onClick: () => void runNewAction(createNote),
    },
    ...BLANK_DOCUMENTS.filter((item) => installed.has(item.kind)).map(
      (item) => ({
        id: item.kind,
        label: item.label,
        icon: <IconFileOutline18 />,
        keywords: `${item.label} document blank template`,
        onClick: () => void runNewAction(() => createBlankDocument(item.kind)),
      }),
    ),
  ];

  return [
    {
      id: "folder",
      label: "New Folder",
      icon: <IconFolderOutline18 />,
      keywords: "organize directory",
      shortcut: shortcutGlyphs("library.new-folder"),
      onClick: () => newFolder(),
    },
    {
      id: "smart-folder",
      label: "New Smart Folder",
      icon: <IconFolderSearchOutline18 />,
      keywords: "filter rules saved view",
      onClick: () => newSmartFolder(),
    },
    {
      id: "tag",
      label: "New Tag",
      icon: <IconTagsOutline18 />,
      keywords: "label organize",
      shortcut: shortcutGlyphs("library.new-tag"),
      onClick: () => newTag("tag"),
    },
    {
      id: "tag-group",
      label: "New Tag Group",
      icon: <IconVersionsOutline18 />,
      keywords: "labels organize",
      shortcut: shortcutGlyphs("library.new-tag-group"),
      onClick: () => newTag("tag-group"),
    },
    ...documents,
    { type: "separator" },
    {
      id: "files",
      label: "Import Files",
      icon: <IconFileOutline18 />,
      keywords: "from image video audio pdf font document text file media",
      shortcut: shortcutGlyphs("library.import-files"),
      onClick: () => void runNewAction(() => importPaths("files")),
    },
    {
      id: "folders",
      label: "Import Folders",
      icon: <IconFolderOpenOutline18 />,
      keywords: "from directory media",
      shortcut: shortcutGlyphs("library.import-folders"),
      onClick: () => void runNewAction(() => importPaths("folders")),
    },
    {
      id: "links",
      label: "Import from Links",
      icon: <IconLink2Outline18 />,
      keywords: "url website bookmark save",
      shortcut: shortcutGlyphs("library.import-links"),
      onClick: () => newMenuDialog.open("links"),
    },
    {
      id: "clipboard",
      label: "Import from Clipboard",
      icon: <IconClone2Outline18 />,
      keywords: "paste image files",
      onClick: () => void runNewAction(importClipboard),
    },
    {
      id: "bookmarks",
      label: "Import Bookmarks",
      icon: <IconGlobeOutline18 />,
      keywords: "netscape chrome safari html bookmark file",
      onClick: () => void runNewAction(importBookmarks),
    },
    {
      id: "page-assets",
      label: "Import Page Assets",
      icon: <IconImageOutline18 />,
      keywords: "extract images website scrape batch",
      onClick: () => {
        Dialog.prompt({
          title: "Import Page Assets",
          confirmLabel: "Import",
          placeholder: "https://",
          onConfirm: (url) => void runNewAction(() => importPageAssets(url)),
        });
      },
    },
    {
      id: "pond-package",
      label: "Import Pond Package",
      icon: <IconFolderImportOutline18 />,
      keywords: "archive package migrate",
      onClick: () => void runNewAction(importPondPackage),
    },
    {
      id: "eagle",
      label: "Import Eagle Library",
      icon: <IconDownloadOutline18 />,
      keywords: "migrate archive package",
      onClick: () => void runNewAction(importEagle),
    },
    {
      type: "submenu",
      id: "auto-import",
      label: "Auto Import",
      icon: <IconFolderOpenOutline18 />,
      keywords: "watched folder settings",
      items: [
        {
          id: "watched-folder",
          label: "Watched Folder",
          keywords: "directory local files copy",
          onClick: () => void runNewAction(pickWatchedFolder),
        },
        {
          id: "auto-import-settings",
          label: "Auto Import Settings",
          icon: <IconGear3Outline18 />,
          keywords: "preferences storage",
          onClick: () =>
            openSettings("harvesting", "setting-harvesting-watched-folder"),
        },
      ],
    },
    { type: "separator" },
    {
      type: "submenu",
      id: "connect",
      label: "New Source",
      icon: <IconUserPlusOutline18 />,
      keywords: "new account sync auto import connect",
      items: connectableSourceItems((source) => newSource("connect", source)),
    },
    {
      type: "submenu",
      id: "watch",
      label: "New Watch",
      icon: <IconEyeOutline18 />,
      keywords: "new source public auto import someone watch",
      items: watchableSourceItems((source) => newSource("watch", source)),
    },
    { type: "separator" },
    {
      type: "submenu",
      id: "find-duplicates",
      label: "Find Duplicates",
      icon: <IconClone2Outline18 />,
      keywords: "scan similar exact",
      items: [
        {
          id: "duplicates-all",
          label: "Scan All",
          keywords: "library",
          onClick: () => findDuplicates("all"),
        },
        {
          id: "duplicates-list",
          label: "Current List",
          keywords: "folder view filter",
          onClick: () => findDuplicates("list"),
        },
        {
          id: "duplicates-selected",
          label: "Selected",
          keywords: "selection",
          onClick: () => findDuplicates("selected"),
        },
      ],
    },
    {
      id: "rescan",
      label: "Rescan Library",
      icon: <IconArrowRotateClockwiseOutline18 />,
      keywords: "reconcile index files disk",
      shortcut: shortcutGlyphs("library.rescan"),
      onClick: () => void runNewAction(rescanLibrary),
    },
    {
      id: "verify",
      label: "Verify Integrity",
      icon: <IconShieldCheckOutline18 />,
      keywords: "check missing orphan files disk",
      onClick: () => void runNewAction(verifyIntegrity),
    },
  ];
}

export function filterMenuItems(
  items: MenuItemSpec[],
  search: string,
): MenuItemSpec[] {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  const out: MenuItemSpec[] = [];
  for (const item of items) {
    if (item.type === "separator" || item.type === "custom") continue;
    if (item.type === "group") {
      const children = filterMenuItems(item.items, search);
      if (children.length > 0) {
        out.push({ ...item, items: children });
      } else if (matches(item, terms)) {
        out.push(item);
      }
      continue;
    }
    if (item.type === "submenu") {
      const children = filterMenuItems(item.items, search);
      if (children.length > 0) {
        const parentLabel = labelText(item.label);
        out.push(
          ...children.map((child) => {
            const childLabel = "label" in child ? labelText(child.label) : null;
            return parentLabel && childLabel
              ? { ...child, label: `${parentLabel} · ${childLabel}` }
              : child;
          }),
        );
      } else if (matches(item, terms)) {
        out.push(item);
      }
      continue;
    }
    if (matches(item, terms)) out.push(item);
  }
  return out;
}

function labelText(label: ReactNode): string | null {
  const labels = Children.toArray(label);
  const value = labels.length === 1 ? labels[0] : null;
  return value != null && !isValidElement(value) ? String(value) : null;
}

function matches(item: MenuItemSpec, terms: string[]): boolean {
  if (!("label" in item) && !("keywords" in item)) return false;
  const label = "label" in item ? (labelText(item.label) ?? "") : "";
  const keywords = "keywords" in item ? (item.keywords ?? "") : "";
  const text = `${label} ${keywords}`.toLowerCase();
  return terms.every((term) => text.includes(term));
}
