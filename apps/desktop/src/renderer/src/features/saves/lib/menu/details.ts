import {
  IconArchiveOutline18,
  IconArrowRotateClockwiseOutline18,
  IconClone2Outline18,
  IconFileOutline18,
  IconGridOutline18,
  IconImageMinusOutline18,
  IconImagePlusOutline18,
  IconMagicWandOutline18,
  IconMergeOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import { deriveTypeKind } from "@/features/saves/lib/media/units";
import {
  archiveSitesForSelection,
  refreshDetailsForSelection,
} from "@/features/saves/lib/selection";
import { viewerMemory } from "@/features/saves/lib/viewer-memory";
import { inspect } from "@/features/saves/state/inspect";
import {
  getPrefsSnapshot,
  savePrefsSection,
} from "@/features/settings/state/prefs";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import { glyph } from "./shared";
import type { SaveMenuContext } from "./types";

function buildThumbnailBackgroundItems(): MenuItemSpec[] {
  const thumbnailBackground =
    getPrefsSnapshot()?.viewer?.thumbnailBackground ?? "none";
  return (
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
}

export function buildDetailItems({
  save,
  ids,
  batch,
  opened,
  isGif,
  isVideo,
  fileIndex,
  targetFile,
  hasFiles,
  hasCustomThumbnail,
  hasUrl,
  archivable,
}: SaveMenuContext): MenuItemSpec[] {
  return [
    {
      label: "Actions",
      icon: glyph(IconMagicWandOutline18),
      onClick: () => saveLibraryBridge.openActions(ids),
    },
    {
      label: "Find Duplicates",
      icon: glyph(IconClone2Outline18),
      hidden: batch,
      onClick: () => saveLibraryBridge.openDuplicateReview(save.id),
    },
    {
      label: "Merge Duplicates",
      icon: glyph(IconMergeOutline18),
      hidden: batch,
      onClick: () => saveLibraryBridge.openDuplicateReview(save.id),
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
      items: buildThumbnailBackgroundItems(),
    },
  ];
}
