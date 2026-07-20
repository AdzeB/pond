import type { MenuItemSpec } from "@pond/ui";
import {
  copyVideoFrame,
  saveVideoFrame,
  setVideoThumbnail,
} from "@/lib/media/capture-frame";
import { buildSaveMenu } from "@/lib/save/menu";
import { shortcutGlyphs } from "@/lib/save/shortcuts";
import type { Save } from "@/lib/types";

interface BuildViewerMenuOptions {
  /** Whether the tag clipboard is empty (controls the Paste Tags item). */
  clipboardEmpty: boolean;
  /** The <video> under the cursor, when the right-clicked slide is a video. */
  video: HTMLVideoElement | null;
}

/** Frame items operate on the live <video> element so they capture whatever is on screen. */
export function buildViewerMenu(
  save: Save,
  { clipboardEmpty, video }: BuildViewerMenuOptions,
): MenuItemSpec[] {
  const base = buildSaveMenu(save, { clipboardEmpty });
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

  return [...frameItems, ...base];
}
