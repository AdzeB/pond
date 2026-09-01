import type { Row as TanstackRow } from "@tanstack/react-table";
import type { Store } from "@tanstack/store";
import {
  createContext,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  use,
} from "react";
import type { RenderRowArgs, TableColumn } from "./types";

export interface SelectionState {
  selectedIds: Set<string>;
}

export interface RowApi<T> {
  selectionStore: Store<SelectionState>;
  columns: TableColumn<T>[];
  gridTemplate: string;
  selectionEnabled: boolean;
  expansionEnabled: boolean;
  toggleRow: (id: string, extend: boolean) => void;
  toggleExpand: (id: string) => void;
  onRowClick?: (row: T, e: ReactMouseEvent) => void;
  renderRow?: (args: RenderRowArgs<T>) => ReactNode;
}

export interface DataTableContextValue<T> {
  selectionStore: Store<SelectionState>;
  actions: {
    toggleRow: (id: string, extend: boolean) => void;
    toggleAll: (next: boolean) => void;
    clearSelection: () => void;
    toggleExpand: (id: string) => void;
    toggleSort: (id: string) => void;
    resizeColumn: (id: string, width: number) => void;
    reorderColumns: (fromId: string, toId: string) => void;
  };
  meta: {
    columns: TableColumn<T>[];
    gridTemplate: string;
    selectionEnabled: boolean;
    expansionEnabled: boolean;
    rows: TanstackRow<T>[];
    rowCount: number;
    rowHeight: number;
    height?: number;
    overscan: number;
    getSorted: (id: string) => false | "asc" | "desc";
    rowApi: RowApi<T>;
  };
}

// biome-ignore lint/suspicious/noExplicitAny: single shared context, narrowed by useDataTable<T>().
const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

function useDataTable<T>(): DataTableContextValue<T> {
  const ctx = use(DataTableContext);
  if (!ctx)
    throw new Error("DataTable parts must be used within DataTable.Provider");
  return ctx;
}

export { DataTableContext, useDataTable };
