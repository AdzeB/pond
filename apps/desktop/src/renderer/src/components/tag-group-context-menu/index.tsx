import {
  IconPencilOutline18 as Pencil,
  IconTrash2Outline18 as Trash,
} from "@pond/icons/outline/18";
import type { NativeMenuItem } from "@/lib/ui/native-menu";

const ICON = { width: 16, height: 16 } as const;

export interface TagGroupMenuActions {
  onRename: () => void;
  onRequestDelete: () => void;
}

export function buildTagGroupMenuItems(
  a: TagGroupMenuActions,
): NativeMenuItem[] {
  return [
    {
      label: "Edit group name",
      icon: <Pencil {...ICON} />,
      shortcut: ["E"],
      onSelect: a.onRename,
    },
    { type: "separator" },
    {
      label: "Remove",
      icon: <Trash {...ICON} />,
      onSelect: a.onRequestDelete,
    },
  ];
}
