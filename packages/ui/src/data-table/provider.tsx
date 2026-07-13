import {
  type ColumnDef,
  type ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Store } from "@tanstack/store";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DataTableContext,
  type DataTableContextValue,
  type RowApi,
  type SelectionState,
} from "./context";
import type { RenderRowArgs, TableColumn } from "./types";

const SELECT_WIDTH = "40px";
const CARET_WIDTH = "28px";

function defaultCompare(a: unknown, b: unknown): number {
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  }
  const an = a == null ? Number.NEGATIVE_INFINITY : Number(a);
  const bn = b == null ? Number.NEGATIVE_INFINITY : Number(b);
  return an === bn ? 0 : an > bn ? 1 : -1;
}

export interface DataTableProviderProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  getRowId: (row: T) => string;
  getSubRows?: (row: T) => T[] | undefined;
  /** Presence enables row selection. Called whenever selection changes. */
  onSelectionChange?: (ids: string[]) => void;
  defaultSort?: { id: string; desc: boolean };
  /** Controlled expansion: list of expanded row ids. */
  expandedIds?: string[];
  onToggleExpand?: (id: string, next: boolean) => void;
  /** Presence enables virtualization. */
  height?: number;
  rowHeight?: number;
  overscan?: number;
  /** Escape hatch to wrap each row. */
  renderRow?: (args: RenderRowArgs<T>) => ReactNode;
  onRowClick?: (row: T, e: ReactMouseEvent) => void;
  children: ReactNode;
}

export function DataTableProvider<T>({
  data,
  columns,
  getRowId,
  getSubRows,
  onSelectionChange,
  defaultSort,
  expandedIds,
  onToggleExpand,
  height,
  rowHeight = 44,
  overscan = 10,
  renderRow,
  onRowClick,
  children,
}: DataTableProviderProps<T>) {
  const selectionEnabled = onSelectionChange !== undefined;
  const expansionEnabled = getSubRows !== undefined;

  const [selectionStore] = useState(
    () => new Store<SelectionState>({ selectedIds: new Set<string>() }),
  );

  const [sorting, setSorting] = useState<SortingState>(
    defaultSort ? [{ id: defaultSort.id, desc: defaultSort.desc }] : [],
  );
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const expanded = useMemo<ExpandedState>(() => {
    if (!expandedIds) return internalExpanded;
    const rec: Record<string, boolean> = {};
    for (const id of expandedIds) rec[id] = true;
    return rec;
  }, [expandedIds, internalExpanded]);

  const tanstackColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        accessorFn: col.accessor ? (row) => col.accessor?.(row) : undefined,
        enableSorting: Boolean(col.accessor),
        sortingFn: (a, b, id) => defaultCompare(a.getValue(id), b.getValue(id)),
      })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: { sorting, expanded },
    getRowId: (row) => getRowId(row),
    getSubRows: getSubRows ? (row) => getSubRows(row) : undefined,
    onSortingChange: setSorting,
    onExpandedChange: setInternalExpanded,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const flatRows = table.getRowModel().flatRows;

  /** Kept in refs so selection actions stay referentially stable. */
  const orderedIdsRef = useRef<string[]>([]);
  const anchorRef = useRef<string | null>(null);
  const rowChildrenRef = useRef<Map<string, string[]>>(new Map());
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  orderedIdsRef.current = rows.map((r) => r.id);
  const childMap = new Map<string, string[]>();
  for (const r of flatRows) {
    if (r.subRows.length > 0) {
      childMap.set(
        r.id,
        r.subRows.flatMap((s) => [s.id, ...s.subRows.map((g) => g.id)]),
      );
    }
  }
  rowChildrenRef.current = childMap;

  const commitSelection = useCallback(() => {
    onSelectionChangeRef.current?.(
      Array.from(selectionStore.state.selectedIds),
    );
  }, [selectionStore]);

  const actions = useMemo(() => {
    const withDescendants = (id: string): string[] => [
      id,
      ...(rowChildrenRef.current.get(id) ?? []),
    ];

    const toggleRow = (id: string, extend: boolean) => {
      selectionStore.setState((s) => {
        const next = new Set(s.selectedIds);
        const ids = orderedIdsRef.current;
        if (extend && anchorRef.current) {
          const from = ids.indexOf(anchorRef.current);
          const to = ids.indexOf(id);
          if (from >= 0 && to >= 0) {
            const [lo, hi] = from <= to ? [from, to] : [to, from];
            for (let i = lo; i <= hi; i += 1) {
              for (const d of withDescendants(ids[i] as string)) next.add(d);
            }
            return { selectedIds: next };
          }
        }
        const targets = withDescendants(id);
        if (next.has(id)) {
          for (const d of targets) next.delete(d);
        } else {
          for (const d of targets) next.add(d);
        }
        anchorRef.current = id;
        return { selectedIds: next };
      });
      commitSelection();
    };

    const toggleAll = (next: boolean) => {
      selectionStore.setState(() => ({
        selectedIds: next ? new Set(orderedIdsRef.current) : new Set<string>(),
      }));
      anchorRef.current = null;
      commitSelection();
    };

    const clearSelection = () => toggleAll(false);

    const toggleExpand = (id: string) => {
      const isOpen = Boolean(
        expandedIds?.includes(id) ||
          (!expandedIds && (internalExpanded as Record<string, boolean>)[id]),
      );
      if (expandedIds) {
        onToggleExpand?.(id, !isOpen);
      } else {
        setInternalExpanded((prev) => ({
          ...(prev as Record<string, boolean>),
          [id]: !isOpen,
        }));
      }
    };

    const toggleSort = (id: string) => {
      setSorting((prev) => {
        const cur = prev[0];
        if (cur?.id === id) return [{ id, desc: !cur.desc }];
        return [{ id, desc: false }];
      });
    };

    const resizeColumn = (id: string, width: number) => {
      setColumnSizing((prev) => ({
        ...prev,
        [id]: Math.max(48, Math.round(width)),
      }));
    };

    const reorderColumns = (fromId: string, toId: string) => {
      if (fromId === toId) return;
      setColumnOrder((prev) => {
        const base = prev.length > 0 ? prev : columns.map((c) => c.id);
        const from = base.indexOf(fromId);
        const to = base.indexOf(toId);
        if (from < 0 || to < 0) return base;
        const next = [...base];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved as string);
        return next;
      });
    };

    return {
      toggleRow,
      toggleAll,
      clearSelection,
      toggleExpand,
      toggleSort,
      resizeColumn,
      reorderColumns,
    };
  }, [
    selectionStore,
    commitSelection,
    expandedIds,
    internalExpanded,
    onToggleExpand,
    columns,
  ]);

  const orderedColumns = useMemo(() => {
    if (columnOrder.length === 0) return columns;
    const byId = new Map(columns.map((c) => [c.id, c]));
    const ordered: TableColumn<T>[] = [];
    for (const id of columnOrder) {
      const col = byId.get(id);
      if (col) ordered.push(col);
    }
    for (const col of columns) {
      if (!columnOrder.includes(col.id)) ordered.push(col);
    }
    return ordered;
  }, [columns, columnOrder]);

  const gridTemplate = useMemo(() => {
    const parts: string[] = [];
    if (selectionEnabled) parts.push(SELECT_WIDTH);
    if (expansionEnabled) parts.push(CARET_WIDTH);
    for (const col of orderedColumns) {
      const sized = columnSizing[col.id];
      parts.push(
        sized != null ? `${sized}px` : (col.width ?? "minmax(0, 1fr)"),
      );
    }
    return parts.join(" ");
  }, [selectionEnabled, expansionEnabled, orderedColumns, columnSizing]);

  const rowApi = useMemo<RowApi<T>>(
    () => ({
      selectionStore,
      columns: orderedColumns,
      gridTemplate,
      selectionEnabled,
      expansionEnabled,
      toggleRow: actions.toggleRow,
      toggleExpand: actions.toggleExpand,
      onRowClick,
      renderRow,
    }),
    [
      selectionStore,
      orderedColumns,
      gridTemplate,
      selectionEnabled,
      expansionEnabled,
      actions.toggleRow,
      actions.toggleExpand,
      onRowClick,
      renderRow,
    ],
  );

  const getSorted = useCallback(
    (id: string): false | "asc" | "desc" => {
      const cur = sorting[0];
      if (cur?.id !== id) return false;
      return cur.desc ? "desc" : "asc";
    },
    [sorting],
  );

  const value = useMemo<DataTableContextValue<T>>(
    () => ({
      selectionStore,
      actions,
      meta: {
        columns: orderedColumns,
        gridTemplate,
        selectionEnabled,
        expansionEnabled,
        rows,
        rowCount: orderedIdsRef.current.length,
        rowHeight,
        height,
        overscan,
        getSorted,
        rowApi,
      },
    }),
    [
      selectionStore,
      actions,
      orderedColumns,
      gridTemplate,
      selectionEnabled,
      expansionEnabled,
      rows,
      rowHeight,
      height,
      overscan,
      getSorted,
      rowApi,
    ],
  );

  return <DataTableContext value={value}>{children}</DataTableContext>;
}
