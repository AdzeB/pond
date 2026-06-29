import {
  copyVideoFrame,
  saveVideoFrame,
  setVideoThumbnail,
} from "@/lib/media/capture-frame";
import { buildSaveMenu } from "@/lib/save/menu";
import type { Save } from "@/lib/types";
import type { NativeMenuItem } from "@/lib/ui/native-menu";

interface BuildViewerMenuOptions {
  /** Whether the tag clipboard is empty (controls the Paste Tags item). */
  clipboardEmpty: boolean;
  /** The <video> under the cursor, when the right-clicked slide is a video. */
  video: HTMLVideoElement | null;
}

// The save menu, with frame actions prepended when right-clicking a video. The
// frame items operate on the live element so they capture whatever is on screen.
export function buildViewerMenu(
  save: Save,
  { clipboardEmpty, video }: BuildViewerMenuOptions,
): NativeMenuItem[] {
  const base = buildSaveMenu(save, { clipboardEmpty });
  if (!video?.videoWidth) return base;

  const frameItems: NativeMenuItem[] = [
    {
      label: "Set as Video Thumbnail",
      onSelect: () => setVideoThumbnail(save.id, video),
    },
    {
      label: "Copy Current Frame",
      shortcut: ["⇧", "C"],
      onSelect: () => copyVideoFrame(video),
    },
    {
      label: "Save Current Frame…",
      shortcut: ["⇧", "S"],
      onSelect: () => saveVideoFrame(video),
    },
    { type: "separator" },
  ];

  return [...frameItems, ...base];
}
