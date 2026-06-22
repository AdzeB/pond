import { cloneElement, type MouseEvent, type ReactElement } from "react";
import { type NativeMenuItem, showContextMenu } from "@/lib/native-menu";

export interface TagMenuActions {
  groups: string[];
  /** Group name when the user is currently viewing a specific group. */
  inGroup: string | null;
  archived?: boolean;
  onAddToGroup: (group: string) => void;
  onRemoveFromGroup: (group: string) => void;
  onRename: () => void;
  onMerge: () => void;
  onArchive?: (archived: boolean) => void;
  onDelete: () => void;
}

export function buildTagMenuItems(a: TagMenuActions): NativeMenuItem[] {
  const items: NativeMenuItem[] = [];

  if (a.groups.length > 0) {
    items.push({
      label: "Add to Group",
      submenu: a.groups.map((g) => ({
        label: g,
        onSelect: () => a.onAddToGroup(g),
      })),
    });
  }
  if (a.inGroup) {
    items.push({
      label: "Remove from this Group",
      onSelect: () => a.onRemoveFromGroup(a.inGroup as string),
    });
  }

  items.push({ label: "Rename…", onSelect: a.onRename });

  items.push({ label: "Merge into…", onSelect: a.onMerge });

  if (a.onArchive) {
    items.push({
      label: a.archived ? "Unarchive" : "Archive",
      onSelect: () => a.onArchive?.(!a.archived),
    });
  }

  items.push({ type: "separator" }, { label: "Delete", onSelect: a.onDelete });
  return items;
}

interface TagContextMenuProps extends TagMenuActions {
  children: ReactElement<{ onContextMenu?: (e: MouseEvent) => void }>;
}

export function TagContextMenu({ children, ...actions }: TagContextMenuProps) {
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    void showContextMenu(buildTagMenuItems(actions));
  };
  return cloneElement(children, { onContextMenu });
}
