import { useCallback } from "react";
import { openTrayConfirm } from "@/components/library/dock/confirm";
import {
  deleteSelectionForever,
  restoreSelection,
  trashSelection,
} from "@/lib/save/selection";
import { formatNumber } from "@/lib/util/format";
import { useViewMode } from "@/stores/library-view-context";
import { selection } from "@/stores/selection";
import { tumbleToTrash } from "@/stores/trash-tumble";

interface DockActions {
  destructive: () => void;
  confirmDeleteForever: () => void;
}

/** Handlers operate on the live selection store, so in preview mode they early-return against an empty selection. */
export function useDockActions(): DockActions {
  const viewMode = useViewMode();
  const inTrash = viewMode === "trash";

  const destructive = useCallback(() => {
    if (inTrash) {
      void restoreSelection(selection.snapshot());
      return;
    }
    const scope = selection.snapshot();
    void tumbleToTrash(scope).then(() => trashSelection(scope));
  }, [inTrash]);

  const confirmDeleteForever = useCallback(() => {
    const scope = selection.snapshot();
    if (scope.length === 0) return;
    openTrayConfirm({
      title: "Delete Forever",
      description: `Deleting removes the ${scope.length === 1 ? "selected item and its files" : `${formatNumber(scope.length)} selected items and their files`} from your library for good. This can't be undone.`,
      confirmLabel: "Delete Forever",
      returnTo: null,
      onConfirm: () =>
        tumbleToTrash(scope).then(() => deleteSelectionForever(scope)),
    });
  }, []);

  return { destructive, confirmDeleteForever };
}
