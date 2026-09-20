import {
  IconArrowRotateClockwiseOutline18,
  IconTrashXmarkOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { confirmEmptyTrash } from "@/features/saves/lib/empty-trash";

export function buildTrashMenuItems(hasItems: boolean): MenuItemSpec[] {
  return [
    {
      label: "Empty Trash",
      icon: <IconTrashXmarkOutline18 />,
      variant: "destructive",
      disabled: !hasItems,
      onClick: confirmEmptyTrash,
    },
    {
      label: "Restore All Items",
      icon: <IconArrowRotateClockwiseOutline18 />,
      disabled: !hasItems,
      onClick: () => {
        void window.pond.query("saves.restoreAll", {});
      },
    },
  ];
}
