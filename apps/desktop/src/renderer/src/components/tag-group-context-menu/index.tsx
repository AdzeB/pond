import {
  IconPencilOutline18 as Pencil,
  IconTrash2Outline18 as Trash,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { shortcutGlyphs } from "@/lib/save/shortcuts";

const ICON = { width: 16, height: 16 } as const;

export interface TagGroupMenuActions {
  onRename: () => void;
  onRequestDelete: () => void;
}

export function buildTagGroupMenuItems(a: TagGroupMenuActions): MenuItemSpec[] {
  return [
    {
      label: "Edit Group Name",
      icon: <Pencil {...ICON} />,
      shortcut: shortcutGlyphs("tags.rename"),
      onClick: a.onRename,
    },
    { type: "separator" },
    {
      label: "Remove",
      icon: <Trash {...ICON} />,
      onClick: a.onRequestDelete,
    },
  ];
}
