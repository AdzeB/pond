import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

type ColumnAlign = "start" | "center" | "end";

export interface CellContext {
  /** Nesting depth of the row (0 = top level). */
  depth: number;
  /** Whether this row is currently expanded (only meaningful for rows with sub-rows). */
  expanded: boolean;
  /** Whether the row can expand (has sub-rows). */
  canExpand: boolean;
}

export interface HeaderContext {
  sorted: false | "asc" | "desc";
}

/**
 * A single column definition. Feature enablement is intentionally column-level
 * (e.g. `accessor` enables sorting, `resizable` enables resizing) rather than a
 * pile of table-wide boolean props.
 */
export interface TableColumn<T> {
  id: string;
  /** Header content. A function receives sort state for custom rendering. */
  header?: ReactNode | ((ctx: HeaderContext) => ReactNode);
  /** Cell renderer. Receives the row and per-row context. */
  cell: (row: T, ctx: CellContext) => ReactNode;
  /** Presence enables sorting on this column. */
  accessor?: (row: T) => string | number | null | undefined;
  /** CSS grid track for the column, e.g. "120px" | "1.4fr" | "minmax(0, 1fr)". */
  width?: string;
  /** Minimum width in px used while resizing. */
  minWidth?: number;
  align?: ColumnAlign;
  /** Per-column opt-in to resizing. */
  resizable?: boolean;
  /** Per-column opt-in to reordering. */
  reorderable?: boolean;
  /** Hide the header label (used for select/actions style columns). */
  headerHidden?: boolean;
}

/** Args handed to a custom `renderRow`. `cells` is already the rendered cell list. */
export interface RenderRowArgs<T> {
  row: T;
  rowId: string;
  depth: number;
  expanded: boolean;
  canExpand: boolean;
  selected: boolean;
  cells: ReactNode;
  rowProps: {
    role: "row";
    className: string;
    style: React.CSSProperties;
    onClick: (e: ReactMouseEvent) => void;
    "aria-selected"?: boolean;
    "data-depth"?: number;
  };
}
