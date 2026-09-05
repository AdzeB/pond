import { useCallback } from "react";
import { openTrayConfirm } from "@/features/library/components/dock/confirm/confirm";
import { useViewMode } from "@/features/library/state/library-view-context";
import { selection } from "@/features/library/state/selection";
import { tumbleToTrash } from "@/features/library/state/trash-tumble";
import {
  deleteSelectionForever,
  restoreSelection,
  trashSelection,
} from "@/features/saves/lib/selection";
import { formatNumber } from "@/shared/lib/format";

interface DockActions {
  destructive: () => void;
  confirmDeleteForever: () => void;
}

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
