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
    const selected = [...selectionStore.state.selectedIds];
    const next = selected.filter((id) => rowsById.has(id));
    if (next.length !== selected.length) actions.replaceSelection(next);
    if (next.length === 0) return;
    selection.set(
      next.map((id) => rowsById.get(id)).filter((row): row is T => row != null),
    );
  }, [actions, rowsById, selection, selectionStore]);

  return null;
}
