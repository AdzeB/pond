import {
  IconArrowRotateClockwiseOutline18,
  IconTrashXmarkOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { confirmEmptyTrash } from "@/features/saves/lib/empty-trash";

export function buildTrashMenuItems(): MenuItemSpec[] {
  return [
    {
      label: "Restore All",
      icon: <IconArrowRotateClockwiseOutline18 />,
      onClick: () => {
        void window.pond.query("saves.restoreAll", {});
      },
    },
    { type: "separator" },
    {
      label: "Empty Trash",
      icon: <IconTrashXmarkOutline18 />,
      onClick: confirmEmptyTrash,
    },
  ];
}
