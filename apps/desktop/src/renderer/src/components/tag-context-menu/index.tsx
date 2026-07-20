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
import type { MenuItemSpec } from "@pond/ui";
import type { TagGroupOption } from "@/components/settings-tags/lib/context";
import { shortcutGlyphs } from "@/lib/save/shortcuts";

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

export function buildTagMenuItems(a: TagMenuActions): MenuItemSpec[] {
  const items: MenuItemSpec[] = [];

  items.push({
    label: "Edit Label Name",
    icon: <Pencil {...ICON} />,
    shortcut: shortcutGlyphs("tags.rename"),
    onClick: a.onRename,
  });

  const moveTargets = a.groups.filter((g) => g.name !== a.inGroup);
  const moveSubmenu: MenuItemSpec[] = moveTargets.map((g) => ({
    label: g.name,
    icon: <Folder {...ICON} style={{ color: g.color }} />,
    onClick: () => a.onAddToGroup(g.name),
  }));
  if (a.inGroup) {
    if (moveSubmenu.length > 0) moveSubmenu.push({ type: "separator" });
    moveSubmenu.push({
      label: "Remove from Group",
      onClick: () => a.onRemoveFromGroup(a.inGroup as string),
    });
  }
  if (moveSubmenu.length > 0) {
    items.push({
      type: "submenu",
      label: "Move to Group",
      icon: <ArrowRight {...ICON} />,
      items: moveSubmenu,
    });
  }

  items.push({
    label: "Convert to Group",
    icon: <Clover {...ICON} />,
    onClick: a.onConvertToGroup,
  });

  items.push({
    label: "Merge Into",
    icon: <Merge {...ICON} />,
    onClick: a.onMerge,
  });

  items.push({ type: "separator" });

  items.push({
    label: "Delete",
    icon: <Trash {...ICON} />,
    onClick: a.onDelete,
  });
  return items;
}
