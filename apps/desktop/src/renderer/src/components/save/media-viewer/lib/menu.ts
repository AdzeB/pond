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
  /** File index for the slide under the cursor; file actions target this asset. */
  fileIndex: number | null;
}

/** Reads the file index stamped on a blossom slide; prefers this over media src so posters don't resolve to the wrong asset. */
export function fileIndexFromSlide(
  slide: Element | null | undefined,
): number | null {
  if (!slide) return null;
  const raw = slide.getAttribute("data-file-index");
  if (raw == null || raw === "") return null;
  const idx = Number(raw);
  return Number.isFinite(idx) ? idx : null;
}

/** Frame items operate on the live <video> element so they capture whatever is on screen. */
export function buildViewerMenu(
  save: Save,
  { clipboardEmpty, video, fileIndex }: BuildViewerMenuOptions,
): MenuItemSpec[] {
  const base = buildSaveMenu(save, { clipboardEmpty, fileIndex });
  if (!video?.videoWidth) return base;

  /** On a video slide, frame capture replaces Copy Image even if the save also has stills. */
  const withoutCopyImage = base.filter(
    (item) => !("label" in item && item.label === "Copy Image"),
  );

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

  return [...frameItems, ...withoutCopyImage];
}
