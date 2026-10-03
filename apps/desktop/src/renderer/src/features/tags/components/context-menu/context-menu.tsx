import { IconFolderFill18 as Folder } from "@pond/icons/fill/18";
import {
  IconFolderOutline18 as AddToGroup,
  IconArrowRightOutline18 as ArrowRight,
  IconBarsFilterOutline18 as Filter,
  IconMergeOutline18 as Merge,
  IconPencilOutline18 as Pencil,
  IconMinusOutline18 as RemoveFromGroup,
  IconStarMinusOutline18 as StarMinus,
  IconStarPlusOutline18 as StarPlus,
  IconTagsOutline18 as Tags,
  IconTrash2Outline18 as Trash,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import type { ReactElement } from "react";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";

export interface TagMenuActions {
  groups: string[];
  mergeTargets: string[];
  inGroup: string | null;
  starred: boolean;
  onFilter: () => void;
  onSetStarred: (starred: boolean) => void;
  onAddToGroup: (group: string) => void;
  onMoveToGroup: (group: string) => void;
  onRemoveFromGroup: () => void;
  onMerge: (tag: string) => void;
  onRename: () => void;
  onRemove: () => void;
}

function groupItems(
  groups: string[],
  onSelect: (group: string) => void,
): MenuItemSpec[] {
  return groups.map((group) => ({
    label: group,
    icon: <Folder />,
    onClick: () => onSelect(group),
  }));
}

export function buildTagMenuItems(a: TagMenuActions): MenuItemSpec[] {
  const targets = a.groups.filter((group) => group !== a.inGroup);

  return [
    {
      label: "Filter Items with the Tag(s)",
      icon: <Filter />,
      onClick: a.onFilter,
    },
    { type: "separator" },
    {
      label: "Add to Starred",
      icon: <StarPlus />,
      disabled: a.starred,
      onClick: () => a.onSetStarred(true),
    },
    {
      label: "Remove from Starred",
      icon: <StarMinus />,
      disabled: !a.starred,
      onClick: () => a.onSetStarred(false),
    },
    {
      label: "Rename Tag",
      icon: <Pencil />,
      shortcut: shortcutGlyphs("tags.rename"),
      onClick: a.onRename,
    },
    {
      type: "submenu",
      label: "Merge Into",
      icon: <Merge />,
      disabled: a.mergeTargets.length === 0,
      items: a.mergeTargets.map((tag) => ({
        label: tag,
        icon: <Tags />,
        onClick: () => a.onMerge(tag),
      })),
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Add to Group",
      icon: <AddToGroup />,
      disabled: targets.length === 0,
      items: groupItems(targets, a.onAddToGroup),
    },
    {
      type: "submenu",
      label: "Move to Group",
      icon: <ArrowRight />,
      disabled: !a.inGroup || targets.length === 0,
      items: groupItems(targets, a.onMoveToGroup),
    },
    {
      label: "Remove from this Group",
      icon: <RemoveFromGroup />,
      disabled: !a.inGroup,
      onClick: a.onRemoveFromGroup,
    },
    { type: "separator" },
    {
      label: "Remove Tag",
      icon: <Trash />,
      variant: "destructive",
      onClick: a.onRemove,
    },
  ];
}

export function TagContextMenu({
  buildItems,
  children,
}: {
  buildItems: () => MenuItemSpec[];
  children: ReactElement;
}) {
  return (
    <SpecContextMenu
      search
      searchLabel="Search tag operations"
      minWidth="292px"
      buildItems={buildItems}
    >
      {children}
    </SpecContextMenu>
  );
}
