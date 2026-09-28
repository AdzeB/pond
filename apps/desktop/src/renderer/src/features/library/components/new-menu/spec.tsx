import {
  IconArchiveDownloadOutline18,
  IconArrowRotateClockwiseOutline18,
  IconBoxArchiveDownloadOutline18,
  IconBulletListOutline18,
  IconCameraOutline18,
  IconCheckboxCheckedOutline18,
  IconClone2Outline18,
  IconDownloadOutline18,
  IconEyeOutline18,
  IconFileAlertOutline18,
  IconFileOutline18,
  IconFileSettingsOutline18,
  IconFiles2Outline18,
  IconFolderImportOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconFolderRefreshOutline18,
  IconFolderSearchOutline18,
  IconGlobeOutline18,
  IconImageOutline18,
  IconImageSparkleOutline18,
  IconLink2Outline18,
  IconNotepadOutline18,
  IconRenameOutline18,
  IconReportFileOutline18,
  IconScanOutline18,
  IconSettingsWrenchOutline18,
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
import { launchScreenshotTool } from "@/features/library/lib/launch-screenshot";
import { newMenuDialog } from "@/features/library/state/new-menu-dialog";
import {
  connectableSourceItems,
  watchableSourceItems,
} from "@/features/sources/lib/create-menu";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import {
  createBlankDocument,
  createNote,
  exportDebugReport,
  findDuplicates,
  importBookmarks,
  importClipboard,
  importEagle,
  importEaglePackage,
  importLegacyLibrary,
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
      type: "submenu",
      id: "new",
      label: "New",
      icon: <IconFolderOutline18 />,
      keywords: "create folder tag document screenshot",
      items: [
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
          id: "watched-folder",
          label: "New Watched Folder",
          icon: <IconFolderRefreshOutline18 />,
          keywords: "auto import directory local files copy",
          onClick: () => void runNewAction(pickWatchedFolder),
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
        {
          id: "screenshot",
          label: "Capture Screenshot",
          icon: <IconCameraOutline18 />,
          keywords: "screen window desktop image",
          onClick: () => void launchScreenshotTool(),
        },
      ],
    },
    {
      type: "submenu",
      id: "import",
      label: "Import",
      icon: <IconDownloadOutline18 />,
      keywords: "files folders links clipboard bookmarks packages library",
      items: [
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
          onClick: () => newMenuDialog.open({ kind: "links" }),
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
          icon: <IconImageSparkleOutline18 />,
          keywords: "extract images website scrape batch",
          onClick: () => {
            Dialog.prompt({
              title: "Import Page Assets",
              confirmLabel: "Import",
              placeholder: "https://",
              onConfirm: (url) =>
                void runNewAction(() => importPageAssets(url)),
            });
          },
        },
        {
          id: "eagle-package",
          label: "Import Eagle Package",
          icon: <IconBoxArchiveDownloadOutline18 />,
          keywords: "eagle archive package migrate",
          onClick: () => void runNewAction(importEaglePackage),
        },
        {
          id: "pond-package",
          label: "Import Pond Package",
          icon: <IconArchiveDownloadOutline18 />,
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
          id: "legacy-library",
          label: "Import Legacy Library",
          icon: <IconFolderImportOutline18 />,
          keywords: "artstation huaban pixave inboard migrate export",
          items: (["ArtStation", "Huaban", "Pixave", "Inboard"] as const).map(
            (source) => ({
              id: `legacy-${source.toLowerCase()}`,
              label: `Import ${source} Export`,
              icon: <IconFolderImportOutline18 />,
              onClick: () =>
                void runNewAction(() => importLegacyLibrary(source)),
            }),
          ),
        },
      ],
    },
    {
      type: "submenu",
      id: "sources",
      label: "Sources",
      icon: <IconUserPlusOutline18 />,
      keywords: "connect watch accounts",
      items: [
        {
          type: "submenu",
          id: "connect",
          label: "New Source",
          icon: <IconUserPlusOutline18 />,
          keywords: "new account sync auto import connect",
          items: connectableSourceItems((source) =>
            newSource("connect", source),
          ),
        },
        {
          type: "submenu",
          id: "watch",
          label: "New Watch",
          icon: <IconEyeOutline18 />,
          keywords: "new source public auto import someone watch",
          items: watchableSourceItems((source) => newSource("watch", source)),
        },
      ],
    },
    {
      type: "submenu",
      id: "library",
      label: "Library",
      icon: <IconFiles2Outline18 />,
      keywords: "duplicates rescan verify repair diagnostics",
      items: [
        {
          type: "submenu",
          id: "find-duplicates",
          label: "Find Duplicates",
          icon: <IconFiles2Outline18 />,
          keywords: "scan similar exact",
          items: [
            {
              id: "duplicates-all",
              label: "Scan All",
              icon: <IconScanOutline18 />,
              keywords: "library",
              onClick: () => findDuplicates("all"),
            },
            {
              id: "duplicates-list",
              label: "Current List",
              icon: <IconBulletListOutline18 />,
              keywords: "folder view filter",
              onClick: () => findDuplicates("list"),
            },
            {
              id: "duplicates-selected",
              label: "Selected",
              icon: <IconCheckboxCheckedOutline18 />,
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
        {
          type: "submenu",
          id: "repair-library",
          label: "Repair Library",
          icon: <IconSettingsWrenchOutline18 />,
          keywords: "fix maintenance metadata filenames thumbnails content",
          items: [
            {
              id: "repair-thumbnails",
              label: "Repair Thumbnails",
              icon: <IconImageOutline18 />,
              onClick: () =>
                newMenuDialog.open({
                  kind: "repair",
                  repair: "thumbnails",
                }),
            },
            {
              id: "repair-physical-file-names",
              label: "Repair Physical File Names",
              icon: <IconRenameOutline18 />,
              onClick: () =>
                newMenuDialog.open({
                  kind: "repair",
                  repair: "physical-file-names",
                }),
            },
            {
              id: "repair-invalid-content",
              label: "Repair Invalid Content",
              icon: <IconFileAlertOutline18 />,
              onClick: () =>
                newMenuDialog.open({
                  kind: "repair",
                  repair: "invalid-content",
                }),
            },
            {
              id: "repair-save-metadata",
              label: "Repair Save Metadata",
              icon: <IconFileSettingsOutline18 />,
              onClick: () =>
                newMenuDialog.open({
                  kind: "repair",
                  repair: "save-metadata",
                }),
            },
          ],
        },
        {
          id: "debug-report",
          label: "Export Debug Report",
          icon: <IconReportFileOutline18 />,
          keywords: "diagnostics support privacy redacted",
          onClick: () => void runNewAction(exportDebugReport),
        },
      ],
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
