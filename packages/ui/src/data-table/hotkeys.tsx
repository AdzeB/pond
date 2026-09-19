import type { RowData } from "@tanstack/react-table";
import { useEffect } from "react";
import { useDataTable } from "./context";

function eventFromEditable(event: KeyboardEvent): boolean {
  const nodes = [event.target, document.activeElement];
  return nodes.some((node) => {
    if (!(node instanceof Element)) return false;
    return (
      node.closest(
        "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='searchbox']",
      ) != null
    );
  });
}

function overlayOpen(): boolean {
  const active = document.activeElement;
  if (!(active instanceof Element)) return false;
  return active.closest('[role="dialog"], [role="menu"]') != null;
}

function keepSelectionOnMouseDown(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('[role="dialog"], [role="menu"]')) return true;
  if (target.closest('[role="columnheader"]')) return true;
  const row = target.closest('[role="row"]');
  return row != null && row.closest('[role="rowgroup"]') != null;
}

export function DataTableHotkeys<T extends RowData>() {
  const { actions, meta, selectionStore } = useDataTable<T>();

  useEffect(() => {
    if (!meta.selectionEnabled) return;

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      if (selectionStore.state.selectedIds.size === 0) return;
      if (keepSelectionOnMouseDown(event.target)) return;
      actions.clearSelection();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || eventFromEditable(event) || overlayOpen()) {
        return;
      }

      const ids = meta.rows.map((row) => row.id);
      if (ids.length === 0) return;

      const selected = selectionStore.state.selectedIds;
      let cursor: string | null = null;
      for (const id of ids) {
        if (selected.has(id)) cursor = id;
      }

      const cmd = event.metaKey || event.ctrlKey;
      if (cmd && event.key.toLowerCase() === "a" && !event.shiftKey) {
        event.preventDefault();
        actions.toggleAll(true);
        return;
      }

      if (event.key === "Escape") {
        if (selected.size === 0) return;
        event.preventDefault();
        actions.clearSelection();
        return;
      }

      if (event.key === "Enter") {
        const id = cursor ?? ids[0];
        const row = meta.rows.find((item) => item.id === id);
        if (!row) return;
        event.preventDefault();
        if (!selected.has(row.id)) actions.selectRow(row.id);
        meta.rowApi.onRowClick?.(row.original);
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      const delta = event.key === "ArrowDown" ? 1 : -1;
      const from = cursor ? ids.indexOf(cursor) : -1;
      const nextIdx =
        from < 0
          ? delta > 0
            ? 0
            : ids.length - 1
          : Math.min(ids.length - 1, Math.max(0, from + delta));
      const next = ids[nextIdx];
      if (!next) return;
      event.preventDefault();
      if (event.shiftKey) actions.toggleRow(next, true);
      else actions.selectRow(next);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [actions, meta, selectionStore]);

  return null;
}
