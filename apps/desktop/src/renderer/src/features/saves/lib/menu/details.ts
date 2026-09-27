import {
  IconArchiveOutline18,
  IconArrowRotateClockwiseOutline18,
  IconClipboardArrowInOutline18,
  IconClone2Outline18,
  IconContrastOutline18,
  IconFileOutline18,
  IconFocusOutline18,
  IconGridOutline18,
  IconImageMinusOutline18,
  IconImagePlusOutline18,
  IconMagicWandOutline18,
  IconMergeOutline18,
  IconRefreshOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { createElement } from "react";
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
    icon: createElement("span", {
      "aria-hidden": true,
      style: {
        width: 14,
        height: 14,
        border: "1px solid currentColor",
        borderRadius: 3,
        background:
          value === "grid"
            ? "conic-gradient(#b6b6b6 25%, #fff 0 50%, #b6b6b6 0 75%, #fff 0) 0 0 / 6px 6px"
            : value === "none"
              ? "linear-gradient(135deg, transparent 45%, currentColor 46% 54%, transparent 55%)"
              : value,
      },
    }),
    checked: thumbnailBackground === value,
    onCheckedChange: () => {
      void savePrefsSection("viewer", { thumbnailBackground: value });
    },
  }));
}

export function buildViewerDisplayItems(
  context: SaveMenuContext,
): MenuItemSpec[] {
  const visible =
    context.opened &&
    !context.batch &&
    deriveTypeKind(context.targetFile, context.save) === "image";
  const state = inspect.snapshot();

  return [
    {
      type: "checkbox",
      label: "Navigator",
      icon: glyph(IconFocusOutline18),
      indicator: "check",
      hidden: !visible,
      checked: state.showNavigator,
      onCheckedChange: (checked) => inspect.setShowNavigator(checked),
    },
    {
      type: "checkbox",
      label: "Grayscale",
      icon: glyph(IconContrastOutline18),
      indicator: "check",
      hidden: !visible,
      checked: state.grayscale,
      onCheckedChange: (checked) => inspect.setGrayscale(checked),
    },
  ];
}

export interface DetailMenuItems {
  file: MenuItemSpec[];
  media: MenuItemSpec[];
  organization: MenuItemSpec[];
  source: MenuItemSpec[];
  thumbnail: MenuItemSpec[];
}

export function buildDetailItems({
  save,
  ids,
  batch,
  opened,
  isGif,
  isVideo,
  fileIndex,
  hasFiles,
  hasCustomThumbnail,
  hasUrl,
  archivable,
}: SaveMenuContext): DetailMenuItems {
  return {
    organization: [
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
    ],
    media: [
      {
        label: "Re-analyze Colors",
        icon: glyph(IconMagicWandOutline18),
        hidden: batch || save.mediaType !== "image",
        onClick: () => {
          void window.pond
            .query("saves.reanalyzeColors", { id: save.id })
            .then((result) =>
              notify({
                id: "analyze-colors",
                title: result.ok ? "Colors updated" : "Couldn't analyze colors",
              }),
            );
        },
      },
      {
        label: "Reset Loop Range",
        icon: glyph(IconArrowRotateClockwiseOutline18),
        hidden: !opened || !isGif,
        onClick: () => {
          const file = save.files[fileIndex ?? 0] ?? save.files[0];
          if (!file) return;
          const src = `pond://${save.id}/${file.path}`;
          viewerMemory.setLoop(src, null);
        },
      },
      {
        label: "Set Current Frame as Thumbnail",
        icon: glyph(IconImagePlusOutline18),
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
                  title: "Couldn't set the current frame as thumbnail",
                });
            });
        },
      },
      {
        label: "Load Subtitles",
        icon: glyph(IconFileOutline18),
        hidden: !isVideo,
        onClick: () => {
          void window.pond
            .query("saves.loadSubtitles", { id: save.id })
            .then((result) => {
              if (!result.ok && !result.canceled)
                notify({
                  id: "subtitles",
                  title: "Couldn't load subtitles",
                });
            });
        },
      },
      {
        label: "Refresh Video Poster",
        icon: glyph(IconRefreshOutline18),
        hidden: batch || !isVideo,
        onClick: () => {
          void window.pond
            .query("saves.regeneratePoster", { id: save.id })
            .then((result) =>
              notify({
                id: "video-poster",
                title: result.ok
                  ? "Video poster refreshed"
                  : "Couldn't refresh video poster",
              }),
            );
        },
      },
    ],
    file: [
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
                  title: result.error ?? "Couldn't replace this file",
                });
              }
            });
        },
      },
    ],
    source: [
      {
        label: "Refresh from Source",
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
        label: "Archive Site",
        icon: glyph(IconArchiveOutline18),
        hidden: !archivable,
        onClick: () => {
          if (batch) void archiveSitesForSelection(ids);
          else void window.pond.archiveSite(save.id);
        },
      },
    ],
    thumbnail: [
      {
        label: "Set Thumbnail from File",
        icon: glyph(IconImagePlusOutline18),
        hidden: batch,
        onClick: () => {
          void window.pond.query("saves.setCustomThumbnail", { id: save.id });
        },
      },
      {
        label: "Set Thumbnail from Clipboard",
        icon: glyph(IconClipboardArrowInOutline18),
        hidden: batch,
        onClick: () => {
          void window.pond
            .query("saves.setThumbnailFromClipboard", { id: save.id })
            .then((result) => {
              if (!result.ok)
                notify({
                  id: "thumbnail-clipboard",
                  title: "No image found on the clipboard",
                });
            });
        },
      },
      {
        label: "Reset Thumbnail",
        icon: glyph(IconImageMinusOutline18),
        variant: "destructive",
        hidden: batch || !hasCustomThumbnail,
        onClick: () => {
          void window.pond.query("saves.removeCustomThumbnail", {
            id: save.id,
          });
        },
      },
      {
        type: "submenu",
        label: "Thumbnail Background",
        icon: glyph(IconGridOutline18),
        hidden: opened || batch,
        items: buildThumbnailBackgroundItems(),
      },
    ],
  };
}
