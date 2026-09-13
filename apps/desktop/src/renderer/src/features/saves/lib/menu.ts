import {
  IconApplicationsOutline18,
  IconArchiveExportOutline18,
  IconArchiveOutline18,
  IconArrowRotateClockwiseOutline18,
  IconArrowUpRightOutline18,
  IconBoxArchiveOutline18,
  IconClipboardOutline18,
  IconClone2Outline18,
  IconConversionOutline18,
  IconCopyIdOutline18,
  IconCopyOutline18,
  IconCoverOutline18,
  IconDotsOutline18,
  IconFileExportOutline18,
  IconFileOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconFolderPlusOutline18,
  IconFolderSendOutline18,
  IconFoldersOutline18,
  IconGlobeOutline18,
  IconGridOutline18,
  IconImageMinusOutline18,
  IconImageOutline18,
  IconImagePlusOutline18,
  IconLink2Outline18,
  IconMagicWandOutline18,
  IconMagnifierOutline18,
  IconMediaPlayOutline18,
  IconMergeOutline18,
  IconOpenInNewWindowOutline18,
  IconPencilOutline18,
  IconPinOutline18,
  IconSlideshowOutline18,
  IconTableDownloadOutline18,
  IconTagPlusOutline18,
  IconTagsOutline18,
  IconTrash2Outline18,
  IconTrashXmarkOutline18,
  IconUndoOutline18,
} from "@pond/icons/outline/18";
import { Dialog, type MenuItemSpec } from "@pond/ui";
import { isAuxiliaryKind, isThumbnailKind } from "@shared/save-file-names";
import { type ComponentType, createElement, type ReactElement } from "react";
import {
  lastUsedFolderId,
  rememberFolderDestinations,
} from "@/features/library/lib/recent-folders";
import { openActionDialog } from "@/features/library/state/action-dialog";
import { openConversionDialog } from "@/features/library/state/conversion-dialog";
import { openDuplicateReview } from "@/features/library/state/duplicate-review";
import { openFolderPicker } from "@/features/library/state/folder-picker";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { openPresentation } from "@/features/library/state/presentation";
import { selection } from "@/features/library/state/selection";
import { tumbleToTrash } from "@/features/library/state/trash-tumble";
import { resetFilters } from "@/features/library/state/view-store";
import {
  copyFilePath,
  copyId,
  copyPrimaryMedia,
  copyTags as copyTagsAction,
  copyUrl,
  focusPaneTitle,
  openDefaultApp,
  openInBrowser,
  openTagPicker,
  pasteTags as pasteTagsAction,
  resolveFileIndex,
  revealFile,
} from "@/features/saves/lib/actions";
import { deriveTypeKind } from "@/features/saves/lib/media/units";
import { purgeSave, trashSave, untrashSave } from "@/features/saves/lib/mutate";
import {
  REVERSE_SEARCH_ENGINES,
  reverseImageSearch,
} from "@/features/saves/lib/reverse-image-search";
import { openSave } from "@/features/saves/lib/save-nav";
import {
  addTagsToSelection,
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
} from "@/features/saves/lib/selection";
import { selectableTasks } from "@/features/saves/lib/tasks";
import { viewerMemory } from "@/features/saves/lib/viewer-memory";
import { inspect } from "@/features/saves/state/inspect";
import { pool } from "@/features/saves/state/pool";
import type { Save, SaveFile } from "@/features/saves/types";
import {
  getPrefsSnapshot,
  savePrefsSection,
} from "@/features/settings/state/prefs";
import { peekTags } from "@/features/tags/state/tags";
import { getAppRouter } from "@/shared/lib/app-router";
import { REVEAL_LABEL } from "@/shared/lib/platform";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";

interface BuildSaveMenuOptions {
  clipboardEmpty: boolean;
  fileIndex?: number | null;
  openWithApps?: readonly OpenWithApp[];
  /** True when this save is already the open viewer. */
  opened?: boolean;
  folderId?: string | null;
  pinnedIds?: readonly string[];
  coverSaveId?: string | null;
  fontActivated?: boolean;
}

export interface OpenWithApp {
  name: string;
  path: string;
  icon: string | null;
  isDefault: boolean;
}

const openWithAppsByKind = new Map<string, OpenWithApp[]>();

export function openWithKind(save: Save, fileIndex?: number | null): string {
  const file =
    typeof fileIndex === "number" ? save.files[fileIndex] : save.files[0];
  const mime = file?.mimeType?.trim();
  if (mime) return mime.toLowerCase();
  const path = file?.path ?? "";
  const dot = path.lastIndexOf(".");
  if (dot >= 0) return path.slice(dot).toLowerCase();
  return save.mediaType ?? save.id;
}

export function peekOpenWithApps(kind: string): OpenWithApp[] {
  return openWithAppsByKind.get(kind) ?? [];
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

function glyph(Icon: ComponentType): ReactElement {
  return createElement(Icon);
}

function addTagItems(ids: readonly string[]): MenuItemSpec[] {
  const items: MenuItemSpec[] = peekTags().map((tag) => ({
    label: tag.name,
    onClick: () => void addTagsToSelection(ids, [tag.name]),
  }));
  items.push({
    label: "New Tag",
    onClick: () => {
      Dialog.prompt({
        title: "New Tag",
        confirmLabel: "Add Tag",
        placeholder: "Tag name",
        onConfirm: (value) => addTagsToSelection(ids, [value]),
      });
    },
  });
  return items;
}

function combinableImageCount(items: readonly Save[]): number {
  return items.filter((item) =>
    item.files.some(
      (file) =>
        file.mimeType === "image/png" ||
        file.mimeType === "image/jpeg" ||
        file.mimeType === "image/jpg" ||
        /\.(png|jpe?g)$/i.test(file.path),
    ),
  ).length;
}

function notifyOpenWith(result: {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
}): void {
  if (!result.ok && !result.cancelled)
    notify({
      id: "open-with",
      title: "Couldn’t open Save",
      description: result.error,
    });
}

function openWith(
  ids: string[],
  fileIndex: number | null,
  application: string,
): void {
  void window.pond
    .query("saves.openWith", {
      ids,
      fileIndex: ids.length > 1 ? undefined : (fileIndex ?? undefined),
      application,
    })
    .then(notifyOpenWith)
    .catch(() => notify({ id: "open-with", title: "Couldn’t open Save" }));
}

function openWithMenuItems(
  ids: string[],
  fileIndex: number | null,
  apps: readonly OpenWithApp[],
): MenuItemSpec[] {
  return apps.map((entry) => ({
    id: entry.path,
    label: entry.isDefault ? `${entry.name} (Default)` : entry.name,
    icon: entry.icon
      ? createElement("img", {
          src: entry.icon,
          alt: "",
          width: 16,
          height: 16,
          draggable: false,
        })
      : undefined,
    onClick: () => openWith(ids, fileIndex, entry.path),
  }));
}

function openFolderLocation(folderId: string): void {
  resetFilters();
  libraryChrome.setNav({ kind: "folder", id: folderId });
  getAppRouter()?.history.push("/");
}

function openAllSaves(): void {
  resetFilters();
  libraryChrome.setNav({ kind: "all" });
  getAppRouter()?.history.push("/");
}

function fileLocationItems(
  entries: ReadonlyArray<{ id: string; name: string }>,
): MenuItemSpec[] {
  return [
    {
      label: "All",
      icon: glyph(IconGridOutline18),
      onClick: openAllSaves,
    },
    { type: "separator" },
    ...entries.map((folder) => ({
      label: folder.name,
      icon: glyph(IconFolderOutline18),
      onClick: () => openFolderLocation(folder.id),
    })),
  ];
}

function startWebpConvert(ids: string[], format: "png" | "jpeg") {
  return window.pond.query("conversion.start", {
    ids,
    fileIndex: 0,
    preset: {
      id: `webp-${format}`,
      name: format === "png" ? "PNG" : "JPG",
      format,
      width: null,
      height: null,
      quality: format === "png" ? 100 : 90,
      start: 0,
      duration: 5,
      fps: 12,
    },
  });
}

export function buildSaveMenu(
  saveOrSaves: Save | readonly Save[],
  {
    clipboardEmpty,
    fileIndex = null,
    openWithApps = [],
    opened = false,
    folderId,
    pinnedIds,
    coverSaveId,
    fontActivated = false,
  }: BuildSaveMenuOptions,
): MenuItemSpec[] {
  const saves = Array.isArray(saveOrSaves) ? saveOrSaves : [saveOrSaves];
  const save = saves[0];
  if (!save) return [];
  const ids =
    selection.has(save.id) && selection.size() > saves.length
      ? [...selection.snapshot()]
      : saves.map((s) => s.id);
  const batch = ids.length > 1;
  const nav = libraryChrome.getState().nav;
  const resolvedFolderId =
    folderId !== undefined ? folderId : nav.kind === "folder" ? nav.id : null;
  const folderView = resolvedFolderId
    ? getPrefsSnapshot()?.folderViews[resolvedFolderId]
    : undefined;
  const resolvedPinned = pinnedIds ?? folderView?.pinnedIds ?? [];
  const resolvedCover =
    coverSaveId !== undefined ? coverSaveId : (folderView?.coverSaveId ?? null);
  const inFolder = Boolean(resolvedFolderId);
  const isPinned = !batch && resolvedPinned.includes(save.id);
  const isCover = !batch && resolvedCover === save.id;
  const incomplete = ids.length > saves.length;
  const hasFiles = incomplete || saves.some((s) => resolveFileIndex(s) != null);
  const hasTags = incomplete || saves.some((s) => s.tags.length > 0);
  const allTrashed = saves.every((s) => Boolean(s.deletedAt));
  const hasUrl = incomplete || saves.some((s) => Boolean(s.url));
  const hasHttpUrl = incomplete || saves.some((s) => isHttpUrl(s.url));
  const targetIndex = resolveFileIndex(save, fileIndex);
  const targetFile =
    targetIndex != null ? (save.files[targetIndex] ?? null) : null;
  const isGif =
    !batch &&
    (targetFile?.mimeType === "image/gif" ||
      /\.gif(?:$|[?#])/i.test(targetFile?.path ?? ""));
  const isWebp =
    !batch &&
    (targetFile?.mimeType === "image/webp" ||
      /\.webp(?:$|[?#])/i.test(targetFile?.path ?? ""));
  const isVideo = !batch && deriveTypeKind(targetFile, save) === "video";
  const copyLabel = isVideo ? "Copy Video" : "Copy";
  const archivable =
    incomplete ||
    saves.some((s) => Boolean(s.url) && s.source === "web" && !s.deletedAt);
  const hasCustomThumbnail =
    !batch &&
    save.files.some((file: SaveFile) => isThumbnailKind(file.kind)) &&
    save.files.some((file: SaveFile) => !isAuxiliaryKind(file.kind));
  const canRename = !batch && save.source === "local";

  const reverseSearchItems: MenuItemSpec[] = REVERSE_SEARCH_ENGINES.map(
    (engine) => ({
      label: engine.label,
      icon: glyph(IconMagnifierOutline18),
      keywords: engine.key === "saucenao" ? "sauce nao anime" : undefined,
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
          icon: glyph(IconUndoOutline18),
          shortcut: shortcutGlyphs("save.restore"),
          onClick: () => {
            if (batch) void restoreSelection(ids);
            else void untrashSave(save.id);
          },
        },
        {
          label: "Delete Forever",
          icon: glyph(IconTrash2Outline18),
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
          icon: glyph(IconTrashXmarkOutline18),
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
      icon: glyph(IconOpenInNewWindowOutline18),
      hidden: batch || opened,
      shortcut: shortcutGlyphs("grid.open"),
      onClick: () => openSave(save.id),
    },
    {
      label: "Open with Default App",
      icon: glyph(IconArrowUpRightOutline18),
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.open"),
      onClick: () => {
        if (batch) void openDefaultAppForSelection(ids);
        else void openDefaultApp(save, fileIndex);
      },
    },
    ...(hasFiles ? openWithMenuItems(ids, fileIndex, openWithApps) : []),
    { type: "separator" },
    {
      label: REVEAL_LABEL,
      icon: glyph(IconFolderOpenOutline18),
      keywords: "finder explorer",
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.reveal"),
      onClick: () => {
        if (batch) void revealFilesForSelection(ids);
        else void revealFile(save, fileIndex);
      },
    },
    {
      type: "submenu",
      label: "Open File Location",
      icon: glyph(IconFolderOutline18),
      hidden: batch || folders.forSave(save.id).length === 0,
      items: fileLocationItems(folders.forSave(save.id)),
    },
    batch
      ? {
          label: "Open Original URL",
          icon: glyph(IconLink2Outline18),
          hidden: !hasHttpUrl,
          shortcut: shortcutGlyphs("save.open-url"),
          onClick: () => void openInBrowserForSelection(ids),
        }
      : {
          type: "link",
          label: "Open Original URL",
          icon: glyph(IconLink2Outline18),
          hidden: !hasHttpUrl,
          shortcut: shortcutGlyphs("save.open-url"),
          href: save.url ?? "",
          onClick: () => void openInBrowser(save),
        },
  ];

  const lastFolderId = lastUsedFolderId();
  const lastFolder = lastFolderId
    ? (folders.snapshot().find((folder) => folder.id === lastFolderId) ?? null)
    : null;

  const copyItems: MenuItemSpec[] = [
    {
      label: copyLabel,
      icon: glyph(IconCopyOutline18),
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.copy-image"),
      onClick: () => {
        if (batch) void copyFilesForSelection(ids);
        else void copyPrimaryMedia(save, fileIndex);
      },
    },
    {
      label: "Copy File Path",
      icon: glyph(IconFileOutline18),
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
      label: "Copy Pond Link",
      icon: glyph(IconLink2Outline18),
      onClick: () => {
        void window.pond
          .query("saves.copyInternalLinks", { ids })
          .then(() =>
            notify({
              id: "copy-pond-link",
              title: ids.length > 1 ? "Pond links copied" : "Pond link copied",
            }),
          )
          .catch(() =>
            notify({ id: "copy-pond-link", title: "Couldn’t copy Pond link" }),
          );
      },
    },
    {
      label: "Copy URL",
      icon: glyph(IconGlobeOutline18),
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
      label: "Copy Tags",
      icon: glyph(IconTagsOutline18),
      hidden: !hasTags,
      shortcut: shortcutGlyphs("save.copy-tags"),
      onClick: () => {
        if (batch) copyTagsForSelection(ids);
        else copyTagsAction(save);
      },
    },
  ];

  const addItems: MenuItemSpec[] = [
    {
      label: "Add Tag",
      icon: glyph(IconTagPlusOutline18),
      shortcut: shortcutGlyphs("save.add-tag"),
      hidden: batch,
      onClick: () => openTagPicker(),
    },
    {
      type: "submenu",
      label: "Add Tag",
      icon: glyph(IconTagPlusOutline18),
      hidden: !batch,
      items: addTagItems(ids),
    },
    {
      label: "Add to Last Used Folder",
      icon: glyph(IconFolderPlusOutline18),
      hidden: !lastFolder,
      onClick: () => {
        if (!lastFolder) return;
        void window.pond
          .query("folders.addSaves", {
            folderId: lastFolder.id,
            saveIds: ids,
          })
          .then(() => {
            rememberFolderDestinations([lastFolder.id]);
            void folders.refresh();
          });
      },
    },
    {
      label: "Add to Folders",
      icon: glyph(IconFoldersOutline18),
      onClick: () => openFolderPicker(ids),
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
            else if (result.error !== "canceled")
              notify({
                id: "library-copy",
                title: result.error || "Couldn't copy Saves.",
              });
          })
          .catch(() =>
            notify({ id: "library-copy", title: "Couldn't copy Saves." }),
          );
      },
    },
  ];

  const exportItems: MenuItemSpec[] = [
    {
      label: "Export Files",
      icon: glyph(IconFileExportOutline18),
      keywords: "files",
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.export"),
      onClick: () => {
        void exportSelectionFiles(ids);
      },
    },
    {
      label: "Export Converted Files",
      icon: glyph(IconConversionOutline18),
      hidden: !hasFiles,
      onClick: () => openConversionDialog(ids, fileIndex ?? 0),
    },
    {
      label: "Export as WebP",
      icon: glyph(IconImageOutline18),
      hidden: !hasFiles,
      onClick: () => {
        void window.pond.query("saves.exportWebp", { ids });
      },
    },
    {
      label: "Convert to PNG",
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, "png");
      },
    },
    {
      label: "Convert to JPG",
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, "jpeg");
      },
    },
    {
      label: "Export Pond Package",
      icon: glyph(IconBoxArchiveOutline18),
      keywords: "package",
      onClick: () => {
        void window.pond
          .query("saves.exportPackage", { ids })
          .then((result) => {
            if (!result.ok && result.error !== "canceled")
              notify({
                id: "package-export",
                title: result.error || "Couldn't export package.",
              });
            else if (result.ok)
              notify({ id: "package-export", title: "Pond package exported" });
          });
      },
    },
    {
      label: "Export to CSV",
      icon: glyph(IconTableDownloadOutline18),
      keywords: "csv",
      onClick: () => void exportSelectionCsv(ids),
    },
  ];

  const prefs = getPrefsSnapshot();
  const runItems: MenuItemSpec[] = [];
  const maintenanceItems: MenuItemSpec[] = [];
  for (const task of selectableTasks()) {
    const items =
      task.id === "re-embed" || task.id === "rebuild-visual"
        ? maintenanceItems
        : runItems;
    items.push({
      label: task.label,
      icon: glyph(IconMediaPlayOutline18),
      hidden: allTrashed,
      keywords: task.keywords.join(" "),
      disabled: task.precondition?.(prefs) != null,
      onClick: () => {
        void Promise.resolve(task.run(ids));
      },
    });
  }
  if (incomplete || failedIdsIn(ids).length > 0) {
    runItems.push({
      label: "Retry Failed",
      icon: glyph(IconArrowRotateClockwiseOutline18),
      onClick: () => void retryFailedSelection(ids),
    });
  }

  const thumbnailBackground =
    getPrefsSnapshot()?.viewer?.thumbnailBackground ?? "none";
  const thumbnailBackgroundItems: MenuItemSpec[] = (
    [
      ["none", "None"],
      ["black", "Black"],
      ["gray", "Gray"],
      ["white", "White"],
      ["grid", "Grid"],
    ] as const
  ).map(([value, label]) => ({
    type: "checkbox",
    label,
    checked: thumbnailBackground === value,
    onCheckedChange: () => {
      void savePrefsSection("viewer", { thumbnailBackground: value });
    },
  }));

  const moreItems: MenuItemSpec[] = [
    {
      label: "Actions",
      icon: glyph(IconMagicWandOutline18),
      onClick: () => openActionDialog(ids),
    },
    {
      label: "Find Duplicates",
      icon: glyph(IconClone2Outline18),
      hidden: batch,
      onClick: () => openDuplicateReview({ saveId: save.id }),
    },
    {
      label: "Merge Duplicates",
      icon: glyph(IconMergeOutline18),
      hidden: batch,
      onClick: () => openDuplicateReview({ saveId: save.id }),
    },
    {
      label: "Set Thumbnail",
      icon: glyph(IconImagePlusOutline18),
      hidden: batch,
      onClick: () => {
        void window.pond.query("saves.setCustomThumbnail", { id: save.id });
      },
    },
    {
      label: "Reset Loop Range",
      hidden: !opened || !isGif,
      onClick: () => {
        const file = save.files[fileIndex ?? 0] ?? save.files[0];
        if (!file) return;
        const src = `pond://${save.id}/${file.path}`;
        viewerMemory.setLoop(src, null);
      },
    },
    {
      label: "Set as GIF Thumbnail",
      hidden: !opened || !isGif,
      onClick: () => {
        const file = save.files[fileIndex ?? 0] ?? save.files[0];
        if (!file) return;
        const src = `pond://${save.id}/${file.path}`;
        const canvas = document.querySelector<HTMLCanvasElement>(
          `[data-gif-player] canvas[data-frame]`,
        );
        const frameIndex = Number(canvas?.getAttribute("data-frame") ?? 0);
        void window.pond
          .query("saves.setGifThumbnail", {
            id: save.id,
            src,
            frameIndex: Number.isFinite(frameIndex) ? frameIndex : 0,
          })
          .then((result) => {
            if (!result.ok)
              notify({
                id: "gif-thumb",
                title: "Couldn't set this GIF frame as the thumbnail.",
              });
          });
      },
    },
    {
      type: "checkbox",
      label: "Show Navigator",
      hidden: !opened || deriveTypeKind(targetFile, save) !== "image",
      checked: inspect.snapshot().showNavigator,
      onCheckedChange: () => inspect.toggleNavigator(),
    },
    {
      label: "Load Subtitles",
      hidden: !isVideo,
      onClick: () => {
        void window.pond
          .query("saves.loadSubtitles", { id: save.id })
          .then((result) => {
            if (!result.ok && !result.canceled)
              notify({
                id: "subtitles",
                title: "Couldn't load subtitles.",
              });
          });
      },
    },
    {
      label: "Replace File",
      icon: glyph(IconFileOutline18),
      hidden: batch || !hasFiles,
      onClick: () => {
        void window.pond
          .query("saves.replaceFile", { id: save.id })
          .then((result) => {
            if (result.canceled) return;
            if (!result.ok) {
              notify({
                id: "replace-file",
                title: result.error ?? "Couldn’t replace this file.",
              });
            }
          });
      },
    },
    {
      label: "Remove Thumbnail",
      icon: glyph(IconImageMinusOutline18),
      hidden: batch || !hasCustomThumbnail,
      onClick: () => {
        void window.pond.query("saves.removeCustomThumbnail", { id: save.id });
      },
    },
    {
      label: "Refresh Details",
      icon: glyph(IconArrowRotateClockwiseOutline18),
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
      icon: glyph(IconArchiveOutline18),
      hidden: !archivable,
      onClick: () => {
        if (batch) void archiveSitesForSelection(ids);
        else void window.pond.archiveSite(save.id);
      },
    },
    {
      type: "submenu",
      label: "Thumbnail Background",
      icon: glyph(IconGridOutline18),
      hidden: opened || batch,
      items: thumbnailBackgroundItems,
    },
  ];

  const organizeItems: MenuItemSpec[] = [
    {
      label: "Rename",
      icon: glyph(IconPencilOutline18),
      hidden: !canRename,
      shortcut: shortcutGlyphs("save.rename"),
      onClick: () => focusPaneTitle(),
    },
    {
      label: "Rename Saves",
      icon: glyph(IconPencilOutline18),
      hidden: !batch,
      onClick: () => openActionDialog(ids, "rename"),
    },
    ...addItems,
    {
      label: "Paste Tags",
      icon: glyph(IconClipboardOutline18),
      disabled: clipboardEmpty,
      shortcut: shortcutGlyphs("save.paste-tags"),
      onClick: () => {
        if (batch) void pasteTagsForSelection(ids);
        else void pasteTagsAction(save);
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
        void saveFolderPresentation(resolvedFolderId, { pinnedIds: [...next] });
      },
    },
    {
      label: isCover ? "Remove Folder Cover" : "Set as Folder Cover",
      icon: glyph(IconCoverOutline18),
      hidden: !inFolder || batch,
      onClick: () => {
        if (!resolvedFolderId) return;
        void saveFolderPresentation(resolvedFolderId, {
          coverSaveId: isCover ? null : save.id,
        });
      },
    },
  ];
  openItems.push({
    label: "Enter Presentation Mode",
    icon: glyph(IconSlideshowOutline18),
    hidden: allTrashed,
    onClick: openPresentation,
  });
  const advancedItems: MenuItemSpec[] = [
    {
      label: "Copy Save ID",
      icon: glyph(IconCopyIdOutline18),
      shortcut: shortcutGlyphs("save.copy-id"),
      onClick: () => {
        if (batch) {
          void copyIdsForSelection(ids).then(notifyCopy);
          return;
        }
        void copyId(save.id);
      },
    },
    ...maintenanceItems,
    { type: "separator" },
    {
      label: "Combine Images",
      icon: glyph(IconImageOutline18),
      hidden: combinableImageCount(saves) < 2,
      onClick: () => {
        const nav = libraryChrome.getState().nav;
        void window.pond
          .query("saves.combineImages", {
            ids,
            folderId: nav.kind === "folder" ? nav.id : null,
          })
          .then((result) => {
            if (!result.ok) {
              notify({
                id: "combine-images",
                title: result.error ?? "Couldn’t combine these images.",
              });
              return;
            }
            const skipped =
              result.skipped && result.skipped > 0
                ? ` Skipped ${result.skipped} that are not JPG or PNG.`
                : "";
            notify({
              id: "combine-images",
              title: `Combined ${ids.length} images.${skipped}`,
            });
          });
      },
    },
    {
      label: fontActivated ? "Deactivate Font" : "Activate Font",
      icon: glyph(IconFileOutline18),
      hidden: batch || save.mediaType !== "font",
      onClick: () => {
        void window.pond.query(
          fontActivated ? "saves.deactivateFont" : "saves.activateFont",
          { id: save.id },
        );
      },
    },
    {
      type: "submenu",
      label: "Search by Image",
      icon: glyph(IconMagnifierOutline18),
      hidden: !hasHttpUrl,
      items: reverseSearchItems,
    },
    ...moreItems,
  ];

  return [
    {
      type: "submenu",
      id: `open:${openWithApps.some((app) => app.icon) ? "icons" : "names"}`,
      label: "Open",
      icon: glyph(IconApplicationsOutline18),
      hidden: submenuHidden(openItems),
      items: openItems,
    },
    {
      type: "submenu",
      label: "Organise",
      icon: glyph(IconFoldersOutline18),
      hidden: submenuHidden(organizeItems),
      items: organizeItems,
    },
    {
      type: "submenu",
      label: "Copy",
      icon: glyph(IconCopyOutline18),
      hidden: submenuHidden(copyItems),
      items: copyItems,
    },
    {
      label: "Share",
      icon: glyph(IconFolderSendOutline18),
      hidden: !hasFiles || batch,
      onClick: () => {
        void window.pond
          .query("saves.share", {
            id: save.id,
            fileIndex: fileIndex ?? undefined,
          })
          .then((result) => {
            if (!result.ok) {
              notify({
                id: "share",
                title: result.error ?? "Couldn’t share this file.",
              });
            }
          });
      },
    },
    {
      type: "submenu",
      label: "Export",
      icon: glyph(IconArchiveExportOutline18),
      hidden: submenuHidden(exportItems),
      items: exportItems,
    },
    {
      type: "submenu",
      label: "Agent",
      icon: glyph(IconMediaPlayOutline18),
      hidden: allTrashed || submenuHidden(runItems),
      items: runItems,
    },
    {
      type: "submenu",
      label: "Advanced",
      icon: glyph(IconDotsOutline18),
      hidden: submenuHidden(advancedItems),
      items: advancedItems,
    },
    { type: "separator" },
    ...restoreItems,
  ];
}

export async function loadOpenWithApps({
  ids,
  fileIndex,
  kind,
  onApps,
}: {
  ids: string[];
  fileIndex?: number | null;
  kind: string;
  onApps: (apps: OpenWithApp[]) => void;
}): Promise<void> {
  const cached = openWithAppsByKind.get(kind);
  if (cached?.length) onApps(cached);
  try {
    const apps = await listOpenWithApps(ids, fileIndex);
    if (apps.length) {
      openWithAppsByKind.set(kind, apps);
      onApps(apps);
    } else if (!cached?.length) {
      onApps([]);
    }
    if (!apps.some((app) => app.icon == null)) return;
    const next = await listOpenWithApps(ids, fileIndex, true);
    if (!next.length) return;
    openWithAppsByKind.set(kind, next);
    onApps(next);
  } catch {
    if (cached?.length) onApps(cached);
  }
}

async function listOpenWithApps(
  ids: string[],
  fileIndex?: number | null,
  includeIcons = false,
): Promise<OpenWithApp[]> {
  const listed = await window.pond.query("saves.listOpenWith", {
    ids,
    fileIndex: fileIndex ?? undefined,
    includeIcons: includeIcons || undefined,
  });
  return listed.apps ?? [];
}

function notifyCopy(result: { ok: boolean; message: string }): void {
  if (!result.ok) return;
  notify({ id: "copy-selection", title: result.message });
}
