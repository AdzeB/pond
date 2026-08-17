import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

type ColumnAlign = "start" | "center" | "end";

export interface CellContext {
  /** Nesting depth of the row (0 = top level). */
  depth: number;
  /** Only meaningful for rows with sub-rows. */
  expanded: boolean;
  canExpand: boolean;
}

export interface HeaderContext {
  sorted: false | "asc" | "desc";
}

/**
 * A single column definition. Feature enablement is intentionally column-level:
 * `accessor` enables sorting, `resizable` enables resizing, rather than table-wide boolean props.
 */
export interface TableColumn<T> {
  id: string;
  /** Header content. A function receives sort state for custom rendering. */
  header?: ReactNode | ((ctx: HeaderContext) => ReactNode);
  cell: (row: T, ctx: CellContext) => ReactNode;
  /** Presence enables sorting on this column. */
  accessor?: (row: T) => string | number | null | undefined;
  /** CSS grid track for the column, e.g. "120px" | "1.4fr" | "minmax(0, 1fr)". */
  width?: string;
  /** Minimum width in px used while resizing. */
  minWidth?: number;
  align?: ColumnAlign;
  resizable?: boolean;
  reorderable?: boolean;
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
    "data-selected"?: "";
    "data-depth"?: number;
  };
}
