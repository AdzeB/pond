import { IconTrash, IconTrashXmark, IconUndo } from "@pond/icons";
import type { MenuItemSpec } from "@pond/ui";
import { purgeSave, trashSave, untrashSave } from "@/features/saves/lib/mutate";
import {
  deleteSelectionForever,
  restoreSelection,
  trashSelection,
} from "@/features/saves/lib/selection";
import { tumbleToTrash } from "@/features/saves/state/trash-tumble";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { glyph } from "./shared";
import type { SaveMenuContext } from "./types";

export function buildTrashItems({
  save,
  saves,
  ids,
  batch,
  allTrashed,
}: SaveMenuContext): MenuItemSpec[] {
  return allTrashed
    ? [
        {
          label: "Restore from Trash",
          icon: glyph(IconUndo),
          shortcut: shortcutGlyphs("save.restore"),
          onClick: () => {
            if (batch) void restoreSelection(ids);
            else void untrashSave(save.id);
          },
        },
        {
          label: "Delete Forever",
          icon: glyph(IconTrash),
          variant: "destructive",
          shortcut: shortcutGlyphs("save.delete-forever"),
          onClick: () => {
            if (batch) void deleteSelectionForever(ids);
            else void purgeSave(save.id);
          },
        },
      ]
    : [
        {
          label: "Move to Trash",
          icon: glyph(IconTrashXmark),
          variant: "destructive",
          shortcut: shortcutGlyphs("save.trash"),
          onClick: () => {
            if (batch) {
              const liveIds = saves
                .filter((item) => !item.deletedAt)
                .map((item) => item.id);
              if (liveIds.length === 0) return;
              void tumbleToTrash(liveIds).then(() => trashSelection(liveIds));
              return;
            }
            void tumbleToTrash([save.id]).then(() => trashSave(save.id));
          },
        },
      ];
}
