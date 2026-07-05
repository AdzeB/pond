// biome-ignore-all lint/a11y/useSemanticElements: custom CSS-grid table uses ARIA grid roles by design.
// biome-ignore-all lint/a11y/useFocusableInteractive: grid cells use a row-level keyboard model, not per-cell focus.
// biome-ignore-all lint/a11y/useKeyWithClickEvents: click guards only stop row propagation; keyboard handled at row level.
// biome-ignore-all lint/a11y/useAriaPropsForRole: the resize separator is a pointer-only affordance.

import { useSelector } from "@tanstack/react-store";
import {
  type ColumnDef,
  type ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  type SortingState,
  type Row as TanstackRow,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Store } from "@tanstack/store";
import { clsx as cn } from "clsx";
import {
  Children,
  createContext,
  isValidElement,
  memo,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Checkbox } from "../checkbox";
import styles from "./styles.module.css";
import type {
  CellContext,
  HeaderContext,
  RenderRowArgs,
  TableColumn,
} from "./types";

const SELECT_WIDTH = "40px";
const CARET_WIDTH = "28px";

interface SelectionState {
  selectedIds: Set<string>;
}

interface RowApi<T> {
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

interface DataTableContextValue<T> {
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
  return ctx as DataTableContextValue<T>;
}

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
  /** Present => virtualized. */
  height?: number;
  rowHeight?: number;
  overscan?: number;
  /** Escape hatch to wrap each row (e.g. per-row context + dialogs). */
  renderRow?: (args: RenderRowArgs<T>) => ReactNode;
  onRowClick?: (row: T, e: ReactMouseEvent) => void;
  children: ReactNode;
}

function DataTableProvider<T>({
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

  // Kept in refs so selection actions stay referentially stable.
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

// ── Cells ────────────────────────────────────────────────────────────────

function stop(e: ReactMouseEvent) {
  e.stopPropagation();
}

function SelectCell({
  store,
  rowId,
  onToggle,
}: {
  store: Store<SelectionState>;
  rowId: string;
  onToggle: (extend: boolean) => void;
}) {
  const selected = useSelector(store, (s) => s.selectedIds.has(rowId));
  const selecting = useSelector(store, (s) => s.selectedIds.size > 0);
  return (
    <div className={styles["select-cell"]} role="gridcell" onClick={stop}>
      <Checkbox.Root
        className={styles.check}
        checked={selected}
        data-active={selecting || undefined}
        aria-label={selected ? "Deselect row" : "Select row"}
        onClick={stop}
        onCheckedChange={() => onToggle(false)}
      >
        <Checkbox.Indicator />
      </Checkbox.Root>
    </div>
  );
}

function CaretCell({
  canExpand,
  expanded,
  onToggle,
}: {
  canExpand: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles["caret-cell"]} role="gridcell" onClick={stop}>
      {canExpand ? (
        <button
          type="button"
          className={styles.caret}
          data-open={expanded || undefined}
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={(e) => {
            stop(e);
            onToggle();
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
            <path
              d="M2.5 1.5 L5.5 4 L2.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────

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

const Row = memo(RowImpl) as typeof RowImpl;

// ── Header ─────────────────────────────────────────────────────────────────

function HeaderCell<T>({ column }: { column: TableColumn<T> }) {
  const { actions, meta } = useDataTable<T>();
  const headRef = useRef<HTMLDivElement>(null);
  const label =
    typeof column.header === "function" ? null : (column.header ?? null);
  const sortable = Boolean(column.accessor);
  const sorted = meta.getSorted(column.id);

  const content =
    typeof column.header === "function"
      ? column.header({ sorted } satisfies HeaderContext)
      : label;

  const dragProps = column.reorderable
    ? {
        draggable: true,
        onDragStart: (e: ReactDragEvent) => {
          e.dataTransfer.setData("text/x-datatable-col", column.id);
          e.dataTransfer.effectAllowed = "move";
        },
        onDragOver: (e: ReactDragEvent) => {
          if (e.dataTransfer.types.includes("text/x-datatable-col")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        },
        onDrop: (e: ReactDragEvent) => {
          const from = e.dataTransfer.getData("text/x-datatable-col");
          if (from) {
            e.preventDefault();
            actions.reorderColumns(from, column.id);
          }
        },
      }
    : {};

  const startResize = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = headRef.current?.getBoundingClientRect().width ?? 0;
    const move = (ev: PointerEvent) => {
      actions.resizeColumn(
        column.id,
        Math.max(column.minWidth ?? 48, startWidth + (ev.clientX - startX)),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const resizeHandle = column.resizable ? (
    <span
      className={styles["resize-handle"]}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      onPointerDown={startResize}
      onClick={stop}
    />
  ) : null;

  if (column.headerHidden) {
    return (
      <div
        ref={headRef}
        role="columnheader"
        className={styles.head}
        aria-hidden
      >
        {resizeHandle}
      </div>
    );
  }

  if (!sortable) {
    return (
      <div
        ref={headRef}
        role="columnheader"
        className={styles.head}
        data-align={column.align}
        {...dragProps}
      >
        <span className={styles["head-static"]}>{content}</span>
        {resizeHandle}
      </div>
    );
  }

  return (
    <div
      ref={headRef}
      role="columnheader"
      className={styles.head}
      data-align={column.align}
      {...dragProps}
    >
      <button
        type="button"
        className={styles["sort-button"]}
        data-active={sorted ? true : undefined}
        aria-label={`Sort by ${typeof content === "string" ? content : column.id}`}
        onClick={() => actions.toggleSort(column.id)}
      >
        {content}
        {sorted ? (
          <svg
            className={styles["sort-caret"]}
            data-desc={sorted === "desc" || undefined}
            width="10"
            height="10"
            viewBox="0 0 10 10"
            aria-hidden="true"
          >
            <path
              d="M2.5 4 L5 6.5 L7.5 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>
      {resizeHandle}
    </div>
  );
}

function DataTableHeader<T>() {
  const { meta } = useDataTable<T>();

  return (
    <div
      role="row"
      className={styles["header-row"]}
      style={{ gridTemplateColumns: meta.gridTemplate }}
    >
      {meta.selectionEnabled ? (
        <div
          role="columnheader"
          className={styles["select-head"]}
          aria-hidden
        />
      ) : null}
      {meta.expansionEnabled ? (
        <div role="columnheader" className={styles.head} aria-hidden />
      ) : null}
      {meta.columns.map((col) => (
        <HeaderCell key={col.id} column={col} />
      ))}
    </div>
  );
}

// ── Body ─────────────────────────────────────────────────────────────────

function DataTableBody<T>({
  extraRow,
  emptyState,
}: {
  extraRow?: ReactNode;
  emptyState?: ReactNode;
}) {
  const { meta } = useDataTable<T>();
  const { rows, rowApi, height, rowHeight, overscan } = meta;

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
    enabled: height !== undefined,
  });

  const renderRow = (row: TanstackRow<T>) => (
    <Row
      key={row.id}
      api={rowApi}
      rowId={row.id}
      data={row.original}
      depth={row.depth}
      expanded={row.getIsExpanded()}
      canExpand={row.getCanExpand()}
    />
  );

  if (height !== undefined) {
    return (
      <div
        ref={parentRef}
        className={styles.body}
        role="rowgroup"
        style={{ height, overflow: "auto" }}
      >
        {extraRow}
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const row = rows[vi.index];
            if (!row) return null;
            return (
              <div
                key={row.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                {renderRow(row)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.body} role="rowgroup">
      {extraRow}
      {rows.length === 0 && !extraRow ? emptyState : rows.map(renderRow)}
    </div>
  );
}

// ── Slots + Root ───────────────────────────────────────────────────────────

function DataTableEmpty(_: { children?: ReactNode }): null {
  return null;
}
function DataTableExtraRow(_: { children?: ReactNode }): null {
  return null;
}

function DataTableRoot<T>({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { meta } = useDataTable<T>();

  let extraRow: ReactNode = null;
  let emptyState: ReactNode = null;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === DataTableExtraRow)
      extraRow = (child.props as { children?: ReactNode }).children;
    else if (child.type === DataTableEmpty)
      emptyState = (child.props as { children?: ReactNode }).children;
  });

  const showHeader = meta.rows.length > 0 || extraRow != null;

  return (
    <div className={cn(styles.container, className)} role="grid">
      {showHeader ? <DataTableHeader<T> /> : null}
      <DataTableBody<T> extraRow={extraRow} emptyState={emptyState} />
    </div>
  );
}

function DataTableToolbar({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <div className={cn(styles.toolbar, className)}>{children}</div>;
}

interface ActionBarSelection {
  count: number;
  ids: string[];
  clear: () => void;
}

function DataTableActionBar<T>({
  children,
  className,
}: {
  children: ReactNode | ((selection: ActionBarSelection) => ReactNode);
  className?: string;
}) {
  const { selectionStore, actions } = useDataTable<T>();
  const count = useSelector(selectionStore, (s) => s.selectedIds.size);
  if (count === 0) return null;
  const selection: ActionBarSelection = {
    count,
    ids: Array.from(selectionStore.state.selectedIds),
    clear: actions.clearSelection,
  };
  return (
    <div
      className={cn(styles["action-bar"], className)}
      role="toolbar"
      aria-label="Bulk actions"
    >
      {typeof children === "function" ? children(selection) : children}
    </div>
  );
}

function DataTableActionBarDivider() {
  return <span className={styles["action-bar-divider"]} aria-hidden />;
}

export const DataTable = {
  Provider: DataTableProvider,
  Root: DataTableRoot,
  Header: DataTableHeader,
  Body: DataTableBody,
  Empty: DataTableEmpty,
  ExtraRow: DataTableExtraRow,
  Toolbar: DataTableToolbar,
  ActionBar: DataTableActionBar,
  ActionBarDivider: DataTableActionBarDivider,
};

export { useDataTable };
