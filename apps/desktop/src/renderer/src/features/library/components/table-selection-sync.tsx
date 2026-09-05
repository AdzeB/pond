import { useDataTable } from "@pond/ui";
import { useEffect } from "react";
import type { RowSelectionStore } from "@/shared/state/row-selection";

export function TableSelectionSync<T>({
  selection,
  rowsById,
}: {
  selection: RowSelectionStore<T>;
  rowsById: Map<string, T>;
}) {
  const { selectionStore, actions } = useDataTable<T>();

  useEffect(() => {
    return selection.subscribe(() => {
      if (selection.size() === 0 && selectionStore.state.selectedIds.size > 0) {
        actions.clearSelection();
      }
    });
  }, [actions, selection, selectionStore]);

  useEffect(() => {
    const ids = [...selectionStore.state.selectedIds];
    if (ids.length === 0) return;
    selection.set(
      ids.map((id) => rowsById.get(id)).filter((row): row is T => row != null),
    );
  }, [rowsById, selection, selectionStore]);

  return null;
}
