import type { MenuItemSpec } from "@pond/ui";
import {
  copyVideoFrame,
  saveVideoFrame,
  setVideoThumbnail,
} from "@/features/saves/lib/media/capture-frame";
import { buildSaveMenu } from "@/features/saves/lib/menu";
import type { Save } from "@/features/saves/types";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";

interface BuildViewerMenuOptions {
  clipboardEmpty: boolean;
  video: HTMLVideoElement | null;
  fileIndex: number | null;
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
  { clipboardEmpty, video, fileIndex }: BuildViewerMenuOptions,
): MenuItemSpec[] {
  const base = buildSaveMenu(save, { clipboardEmpty, fileIndex });
  if (!video?.videoWidth) return base;

  const frameItems: MenuItemSpec[] = [
    {
      label: "Set as Video Thumbnail",
      onClick: () => void setVideoThumbnail(save.id, video),
    },
    {
      label: "Copy Current Frame",
      shortcut: shortcutGlyphs("viewer.copy-frame"),
      onClick: () => void copyVideoFrame(video),
    },
    {
      label: "Save Current Frame",
      shortcut: shortcutGlyphs("viewer.save-frame"),
      onClick: () => void saveVideoFrame(video),
    },
    { type: "separator" },
  ];

  return [...frameItems, ...omitCopyImage(base)];
}
