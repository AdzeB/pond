import {
  IconClone2Outline18,
  IconFloppyDiskOutline18,
  IconImagePlusOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { createElement } from "react";
import {
  copyVideoFrame,
  saveVideoFrame,
  setVideoThumbnail,
} from "@/features/saves/lib/media/capture-frame";
import { buildSaveMenu, type OpenWithApp } from "@/features/saves/lib/menu";
import type { Save } from "@/features/saves/types";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";

interface BuildViewerMenuOptions {
  clipboardEmpty: boolean;
  video: HTMLVideoElement | null;
  fileIndex: number | null;
  openWithApps?: OpenWithApp[];
}

export function fileIndexFromSlide(
  slide: Element | null | undefined,
): number | null {
  if (!slide) return null;
  const raw = slide.getAttribute("data-file-index");
  if (raw == null || raw === "") return null;
  const idx = Number(raw);
  return Number.isFinite(idx) ? idx : null;
}

function omitCopyImage(items: MenuItemSpec[]): MenuItemSpec[] {
  const out: MenuItemSpec[] = [];
  for (const item of items) {
    if (item.type === "submenu" || item.type === "group") {
      out.push({ ...item, items: omitCopyImage(item.items) });
      continue;
    }
    if ("label" in item && item.label === "Copy Image") continue;
    out.push(item);
  }
  return out;
}

export function buildViewerMenu(
  save: Save,
  { clipboardEmpty, video, fileIndex, openWithApps }: BuildViewerMenuOptions,
): MenuItemSpec[] {
  const base = buildSaveMenu(save, {
    clipboardEmpty,
    fileIndex,
    openWithApps,
    opened: true,
  });
  if (!video?.videoWidth) return base;

  return omitCopyImage(base).map((item): MenuItemSpec => {
    if (item.type !== "submenu") return item;
    if (item.label === "Copy") {
      return {
        ...item,
        items: [
          {
            label: "Copy Current Frame",
            icon: createElement(IconClone2Outline18),
            shortcut: shortcutGlyphs("viewer.copy-frame"),
            onClick: () => void copyVideoFrame(video),
          },
          ...item.items,
        ],
      };
    }
    if (item.label === "Export") {
      return {
        ...item,
        items: [
          {
            label: "Save Current Frame",
            icon: createElement(IconFloppyDiskOutline18),
            shortcut: shortcutGlyphs("viewer.save-frame"),
            onClick: () => void saveVideoFrame(video),
          },
          ...item.items,
        ],
      };
    }
    if (item.label === "Advanced") {
      return {
        ...item,
        items: item.items.map(
          (action): MenuItemSpec =>
            "label" in action && action.label === "Set Thumbnail"
              ? {
                  label: "Set Thumbnail",
                  icon: createElement(IconImagePlusOutline18),
                  onClick: () => void setVideoThumbnail(save.id, video),
                }
              : action,
        ),
      };
    }
    return item;
  });
}
