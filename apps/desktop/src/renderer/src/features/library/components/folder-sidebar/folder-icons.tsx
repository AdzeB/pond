import {
  IconAlbum2Outline18,
  IconBookmarkOutline18,
  IconCode2Outline18,
  IconDownloadOutline18,
  IconFolderOutline18,
  IconHashtagOutline18,
} from "@pond/icons/outline/18";

export const FOLDER_ICONS = [
  { id: "folder", label: "Folder", Icon: IconFolderOutline18 },
  { id: "bookmark", label: "Bookmark", Icon: IconBookmarkOutline18 },
  { id: "album", label: "Album", Icon: IconAlbum2Outline18 },
  { id: "tag", label: "Tag", Icon: IconHashtagOutline18 },
  { id: "download", label: "Download", Icon: IconDownloadOutline18 },
  { id: "code", label: "Code", Icon: IconCode2Outline18 },
] as const;

export type FolderIconId = (typeof FOLDER_ICONS)[number]["id"];

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
