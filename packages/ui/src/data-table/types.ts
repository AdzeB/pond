import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

type ColumnAlign = "start" | "center" | "end";

export interface CellContext {
  depth: number;
  expanded: boolean;
  canExpand: boolean;
}

export interface HeaderContext {
  sorted: false | "asc" | "desc";
}

export interface TableColumn<T> {
  id: string;
  header?: ReactNode | ((ctx: HeaderContext) => ReactNode);
  cell: (row: T, ctx: CellContext) => ReactNode;
  accessor?: (row: T) => string | number | null | undefined;
  width?: string;
  minWidth?: number;
  align?: ColumnAlign;
  resizable?: boolean;
  reorderable?: boolean;
  headerHidden?: boolean;
}

export interface RenderRowArgs<T> {
  row: T;
  rowId: string;
  depth: number;
  expanded: boolean;
  canExpand: boolean;
  selected: boolean;
  cells: ReactNode;
  onToggleExpand: () => void;
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
