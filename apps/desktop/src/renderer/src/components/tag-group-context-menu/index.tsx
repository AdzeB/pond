import {
  IconPencilOutline18 as Pencil,
  IconTrashOutline18 as Trash,
} from "@pond/icons/outline/18";
import { cloneElement, type MouseEvent, type ReactElement } from "react";
import { type NativeMenuItem, showContextMenu } from "@/lib/ui/native-menu";

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

interface TagGroupContextMenuProps extends TagGroupMenuActions {
  children: ReactElement<{ onContextMenu?: (e: MouseEvent) => void }>;
}

export function TagGroupContextMenu({
  children,
  ...actions
}: TagGroupContextMenuProps) {
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    void showContextMenu(buildTagGroupMenuItems(actions));
  };
  return cloneElement(children, { onContextMenu });
}
