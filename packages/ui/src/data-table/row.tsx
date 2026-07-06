// biome-ignore-all lint/a11y/useSemanticElements: custom CSS-grid table uses ARIA grid roles by design.
// biome-ignore-all lint/a11y/useFocusableInteractive: grid cells use a row-level keyboard model, not per-cell focus.
// biome-ignore-all lint/a11y/useKeyWithClickEvents: click guards only stop row propagation; keyboard handled at row level.

import { useSelector } from "@tanstack/react-store";
import { clsx as cn } from "clsx";
import {
  memo,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { CaretCell, SelectCell } from "./cells";
import type { RowApi } from "./context";
import styles from "./styles.module.css";
import type { CellContext, RenderRowArgs } from "./types";

interface RowProps<T> {
  api: RowApi<T>;
  rowId: string;
  data: T;
  depth: number;
  expanded: boolean;
  canExpand: boolean;
}

function RowImpl<T>({
  api,
  rowId,
  data,
  depth,
  expanded,
  canExpand,
}: RowProps<T>) {
  const selected = useSelector(api.selectionStore, (s) =>
    s.selectedIds.has(rowId),
  );
  const selecting = useSelector(
    api.selectionStore,
    (s) => s.selectedIds.size > 0,
  );

  const cellCtx: CellContext = { depth, expanded, canExpand };

  const cells: ReactNode[] = [];
  if (api.selectionEnabled) {
    cells.push(
      <SelectCell
        key="__select"
        store={api.selectionStore}
        rowId={rowId}
        onToggle={(extend) => api.toggleRow(rowId, extend)}
      />,
    );
  }
  if (api.expansionEnabled) {
    cells.push(
      <CaretCell
        key="__caret"
        canExpand={canExpand}
        expanded={expanded}
        onToggle={() => api.toggleExpand(rowId)}
      />,
    );
  }
  for (const col of api.columns) {
    cells.push(
      <div
        key={col.id}
        role="gridcell"
        className={styles.cell}
        data-align={col.align ?? undefined}
      >
        {col.cell(data, cellCtx)}
      </div>,
    );
  }

  const onClick = (e: ReactMouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || selecting) {
      if (api.selectionEnabled) api.toggleRow(rowId, e.shiftKey);
      return;
    }
    api.onRowClick?.(data, e);
  };

  const rowProps: RenderRowArgs<T>["rowProps"] = {
    role: "row",
    className: cn(styles.row, selected && styles["row-selected"]),
    style: { gridTemplateColumns: api.gridTemplate },
    onClick,
    "aria-selected": api.selectionEnabled ? selected : undefined,
    "data-depth": depth || undefined,
  };

  if (api.renderRow) {
    return api.renderRow({
      row: data,
      rowId,
      depth,
      expanded,
      canExpand,
      selected,
      cells,
      rowProps,
    });
  }

  return <div {...rowProps}>{cells}</div>;
}

export const Row = memo(RowImpl) as typeof RowImpl;
