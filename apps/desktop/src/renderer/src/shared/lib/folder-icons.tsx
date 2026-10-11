import {
  IconAlbum2Outline18,
  IconBagShoppingOutline18,
  IconBookmarkOutline18,
  IconBookOutline18,
  IconCameraOutline18,
  IconCode2Outline18,
  IconCubeOutline18,
  IconDownloadOutline18,
  IconFlagOutline18,
  IconFolderOutline18,
  IconGamepadOutline18,
  IconGlobeOutline18,
  IconHashtagOutline18,
  IconHeartOutline18,
  IconHouseOutline18,
  IconImageOutline18,
  IconInboxOutline18,
  IconLayersOutline18,
  IconLeafOutline18,
  IconLightbulbOutline18,
  IconLocationOutline18,
  IconMusicNoteOutline18,
  IconNoteOutline18,
  IconPaintbrushOutline18,
  IconPaletteOutline18,
  IconPlaneOutline18,
  IconRocketOutline18,
  IconSparkleOutline18,
  IconStarOutline18,
  IconTrophyOutline18,
  IconTypographyOutline18,
  IconVideoOutline18,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import type { FOLDER_ICON_IDS } from "@pond/schema/folder-presentation";

export type FolderIconId = (typeof FOLDER_ICON_IDS)[number];

export const FOLDER_ICONS: readonly {
  id: FolderIconId;
  label: string;
  Icon: IconComponent;
}[] = [
  { id: "folder", label: "Folder", Icon: IconFolderOutline18 },
  { id: "bookmark", label: "Bookmark", Icon: IconBookmarkOutline18 },
  { id: "album", label: "Album", Icon: IconAlbum2Outline18 },
  { id: "tag", label: "Tag", Icon: IconHashtagOutline18 },
  { id: "download", label: "Download", Icon: IconDownloadOutline18 },
  { id: "code", label: "Code", Icon: IconCode2Outline18 },
  { id: "star", label: "Star", Icon: IconStarOutline18 },
  { id: "heart", label: "Heart", Icon: IconHeartOutline18 },
  { id: "sparkle", label: "Sparkle", Icon: IconSparkleOutline18 },
  { id: "image", label: "Image", Icon: IconImageOutline18 },
  { id: "camera", label: "Camera", Icon: IconCameraOutline18 },
  { id: "video", label: "Video", Icon: IconVideoOutline18 },
  { id: "music", label: "Music", Icon: IconMusicNoteOutline18 },
  { id: "book", label: "Book", Icon: IconBookOutline18 },
  { id: "note", label: "Note", Icon: IconNoteOutline18 },
  { id: "palette", label: "Palette", Icon: IconPaletteOutline18 },
  { id: "brush", label: "Brush", Icon: IconPaintbrushOutline18 },
  { id: "typography", label: "Typography", Icon: IconTypographyOutline18 },
  { id: "layers", label: "Layers", Icon: IconLayersOutline18 },
  { id: "cube", label: "Cube", Icon: IconCubeOutline18 },
  { id: "globe", label: "Globe", Icon: IconGlobeOutline18 },
  { id: "pin", label: "Pin", Icon: IconLocationOutline18 },
  { id: "plane", label: "Plane", Icon: IconPlaneOutline18 },
  { id: "house", label: "House", Icon: IconHouseOutline18 },
  { id: "inbox", label: "Inbox", Icon: IconInboxOutline18 },
  { id: "lightbulb", label: "Lightbulb", Icon: IconLightbulbOutline18 },
  { id: "flag", label: "Flag", Icon: IconFlagOutline18 },
  { id: "trophy", label: "Trophy", Icon: IconTrophyOutline18 },
  { id: "rocket", label: "Rocket", Icon: IconRocketOutline18 },
  { id: "gamepad", label: "Gamepad", Icon: IconGamepadOutline18 },
  { id: "leaf", label: "Leaf", Icon: IconLeafOutline18 },
  { id: "shopping", label: "Shopping", Icon: IconBagShoppingOutline18 },
];

/** Context menus list only the first icons; the full set lives in Customize Folder. */
export const FOLDER_MENU_ICONS = FOLDER_ICONS.slice(0, 6);

export function FolderIcon({ name }: { name?: string }) {
  const Icon =
    FOLDER_ICONS.find((item) => item.id === name)?.Icon ?? IconFolderOutline18;
  return <Icon />;
}

export const FOLDER_SWATCHES = [
  { id: null, label: "Default", css: "var(--ds-gray-8)" },
  { id: "red", label: "Red", css: "var(--ds-red-9)" },
  { id: "orange", label: "Orange", css: "var(--ds-orange-9)" },
  { id: "yellow", label: "Yellow", css: "var(--ds-yellow-9)" },
  { id: "green", label: "Green", css: "var(--ds-green-9)" },
  { id: "teal", label: "Teal", css: "var(--ds-teal-9)" },
  { id: "blue", label: "Blue", css: "var(--ds-blue-9)" },
  { id: "purple", label: "Purple", css: "var(--ds-purple-9)" },
  { id: "pink", label: "Pink", css: "var(--ds-pink-9)" },
] as const;

export function folderColorCss(
  color: string | null | undefined,
): string | undefined {
  if (!color) return undefined;
  const swatch = FOLDER_SWATCHES.find((item) => item.id === color);
  if (swatch) return swatch.css;
  return color.startsWith("#") ? color : undefined;
}
