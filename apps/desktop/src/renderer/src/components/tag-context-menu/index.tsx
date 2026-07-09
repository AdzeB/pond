import {
  IconCloverFill18 as Clover,
  IconFolderFill18 as Folder,
} from "@pond/icons/fill/18";
import {
  IconArrowRightOutline18 as ArrowRight,
  IconMergeOutline18 as Merge,
  IconPencilOutline18 as Pencil,
  IconTrash2Outline18 as Trash,
} from "@pond/icons/outline/18";
import type { TagGroupOption } from "@/components/settings-tags/lib/context";
import type { NativeMenuItem } from "@/lib/ui/native-menu";

const ICON = { width: 16, height: 16 } as const;

export interface TagMenuActions {
  groups: TagGroupOption[];
  /** Group name when the user is currently viewing a specific group. */
  inGroup: string | null;
  onAddToGroup: (group: string) => void;
  onRemoveFromGroup: (group: string) => void;
  onRename: () => void;
  onConvertToGroup: () => void;
  onMerge: () => void;
  onDelete: () => void;
}

export function buildTagMenuItems(a: TagMenuActions): NativeMenuItem[] {
  const items: NativeMenuItem[] = [];

  items.push({
    label: "Edit label name",
    icon: <Pencil {...ICON} />,
    shortcut: ["E"],
    onSelect: a.onRename,
  });

  const moveTargets = a.groups.filter((g) => g.name !== a.inGroup);
  const moveSubmenu: NativeMenuItem[] = moveTargets.map((g) => ({
    label: g.name,
    icon: <Folder {...ICON} style={{ color: g.color }} />,
    onSelect: () => a.onAddToGroup(g.name),
  }));
  if (a.inGroup) {
    if (moveSubmenu.length > 0) moveSubmenu.push({ type: "separator" });
    moveSubmenu.push({
      label: "Remove from group",
      onSelect: () => a.onRemoveFromGroup(a.inGroup as string),
    });
  }
  if (moveSubmenu.length > 0) {
    items.push({
      label: "Move to group",
      icon: <ArrowRight {...ICON} />,
      submenu: moveSubmenu,
    });
  }

  items.push({
    label: "Convert to group",
    icon: <Clover {...ICON} />,
    onSelect: a.onConvertToGroup,
  });

  items.push({
    label: "Merge into…",
    icon: <Merge {...ICON} />,
    onSelect: a.onMerge,
  });

  items.push({ type: "separator" });

  items.push({
    label: "Delete",
    icon: <Trash {...ICON} />,
    onSelect: a.onDelete,
  });
  return items;
}
