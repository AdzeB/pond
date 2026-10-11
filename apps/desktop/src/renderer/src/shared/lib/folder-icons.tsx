import {
  IconAlbum2,
  IconBagShopping,
  IconBook,
  IconBookmark,
  IconCamera,
  IconCode2,
  IconCube,
  IconDownload,
  IconFlag,
  IconFolder,
  IconGamepad,
  IconGlobe,
  IconHashtag,
  IconHeart,
  IconHouse,
  IconImage,
  IconInbox,
  IconLayers,
  IconLeaf,
  IconLightbulb,
  IconLocation,
  IconMusicNote,
  IconNote,
  IconPaintbrush,
  IconPalette,
  IconPlane,
  IconRocket,
  IconSparkle,
  IconStar,
  IconTrophy,
  IconTypography,
  IconVideo,
} from "@pond/icons";
import type { IconComponent } from "@pond/icons/types";
import type { FOLDER_ICON_IDS } from "@pond/schema/folder-presentation";

export type FolderIconId = (typeof FOLDER_ICON_IDS)[number];

export const FOLDER_ICONS: readonly {
  id: FolderIconId;
  label: string;
  Icon: IconComponent;
}[] = [
  { id: "folder", label: "Folder", Icon: IconFolder },
  { id: "bookmark", label: "Bookmark", Icon: IconBookmark },
  { id: "album", label: "Album", Icon: IconAlbum2 },
  { id: "tag", label: "Tag", Icon: IconHashtag },
  { id: "download", label: "Download", Icon: IconDownload },
  { id: "code", label: "Code", Icon: IconCode2 },
  { id: "star", label: "Star", Icon: IconStar },
  { id: "heart", label: "Heart", Icon: IconHeart },
  { id: "sparkle", label: "Sparkle", Icon: IconSparkle },
  { id: "image", label: "Image", Icon: IconImage },
  { id: "camera", label: "Camera", Icon: IconCamera },
  { id: "video", label: "Video", Icon: IconVideo },
  { id: "music", label: "Music", Icon: IconMusicNote },
  { id: "book", label: "Book", Icon: IconBook },
  { id: "note", label: "Note", Icon: IconNote },
  { id: "palette", label: "Palette", Icon: IconPalette },
  { id: "brush", label: "Brush", Icon: IconPaintbrush },
  { id: "typography", label: "Typography", Icon: IconTypography },
  { id: "layers", label: "Layers", Icon: IconLayers },
  { id: "cube", label: "Cube", Icon: IconCube },
  { id: "globe", label: "Globe", Icon: IconGlobe },
  { id: "pin", label: "Pin", Icon: IconLocation },
  { id: "plane", label: "Plane", Icon: IconPlane },
  { id: "house", label: "House", Icon: IconHouse },
  { id: "inbox", label: "Inbox", Icon: IconInbox },
  { id: "lightbulb", label: "Lightbulb", Icon: IconLightbulb },
  { id: "flag", label: "Flag", Icon: IconFlag },
  { id: "trophy", label: "Trophy", Icon: IconTrophy },
  { id: "rocket", label: "Rocket", Icon: IconRocket },
  { id: "gamepad", label: "Gamepad", Icon: IconGamepad },
  { id: "leaf", label: "Leaf", Icon: IconLeaf },
  { id: "shopping", label: "Shopping", Icon: IconBagShopping },
];

/** Context menus list only the first icons; the full set lives in Customize Folder. */
export const FOLDER_MENU_ICONS = FOLDER_ICONS.slice(0, 6);

export function FolderIcon({ name, size }: { name?: string; size?: number }) {
  const Icon =
    FOLDER_ICONS.find((item) => item.id === name)?.Icon ?? IconFolder;
  return <Icon size={size} />;
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
