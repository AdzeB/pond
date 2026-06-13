import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type Updater,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SaveContextMenu } from "@/components/save-context-menu";
import { findScrollParent } from "@/lib/dom";
import type { Save } from "@/lib/types";
import { setSort, useSortDir, useSortKey } from "@/stores/view-store";
import { buildColumns, SORT_KEYS, type SortKey } from "./columns";
import styles from "./styles.module.css";

export function ListView({
  saves,
  selectedId,
  onClick,
  onDoubleClick,
}: {
  saves: ReadonlyArray<Save>;
  selectedId: string | null;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
}) {
  const rawSortKey = useSortKey();
  const rawSortDir = useSortDir();
  const sortKey: SortKey = SORT_KEYS.has(rawSortKey as SortKey)
    ? (rawSortKey as SortKey)
    : "savedAt";
  const sortDir: "asc" | "desc" = rawSortDir === "asc" ? "asc" : "desc";

  const sorting = useMemo<SortingState>(
    () => [{ id: sortKey, desc: sortDir === "desc" }],
    [sortKey, sortDir],
  );

  // First-click direction is per-column `sortDescFirst`; just mirror TanStack's state into the view store.
  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const item = next[0] ?? sorting[0];
      if (!item) return;
      const dir: "asc" | "desc" = item.desc ? "desc" : "asc";
      setSort({ key: item.id, dir });
    },
    [sorting],
  );

  const columns = useMemo(() => buildColumns(), []);

  const table = useReactTable({
    data: saves as Save[],
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false,
    enableSortingRemoval: false,
  });

  const rows = table.getRowModel().rows;
  const headerColumns = columns.length;
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setScrollParent(
      findScrollParent(tableRef.current, { fallbackToDocument: false }),
    );
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    // Initial estimate (thumb 24 + padding 12 + 1px border); real heights are measured per row.
    estimateSize: () => 37,
    getScrollElement: () => scrollParent,
    overscan: 8,
    getItemKey: (i) => rows[i]?.id ?? i,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const lastRow = virtualRows[virtualRows.length - 1];
  const paddingBottom = lastRow ? totalSize - lastRow.end : 0;

  return (
    <table className={styles.table} ref={tableRef}>
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((header) => {
              const className = header.column.columnDef.meta?.className;
              if (header.column.id === "thumbnail") {
                return (
                  <th
                    key={header.id}
                    aria-label="Thumbnail"
                    className={className}
                  />
                );
              }
              const sortedDir = header.column.getIsSorted();
              const ariaSort: "ascending" | "descending" | "none" =
                sortedDir === "asc"
                  ? "ascending"
                  : sortedDir === "desc"
                    ? "descending"
                    : "none";
              return (
                <th key={header.id} className={className} aria-sort={ariaSort}>
                  <button
                    type="button"
                    className={styles["col-header"]}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {sortedDir ? (
                      <span aria-hidden className={styles["sort-indicator"]}>
                        {sortedDir === "asc" ? "↑" : "↓"}
                      </span>
                    ) : null}
                  </button>
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {paddingTop > 0 ? (
          <tr aria-hidden>
            <td colSpan={headerColumns} style={{ height: paddingTop }} />
          </tr>
        ) : null}
        {virtualRows.map((vRow) => {
          const row = rows[vRow.index];
          if (!row) return null;
          const save = row.original;
          return (
            <SaveContextMenu key={save.id} save={save}>
              <tr
                ref={rowVirtualizer.measureElement}
                data-index={vRow.index}
                aria-selected={save.id === selectedId}
                onClick={(e) => onClick(save.id, e)}
                onDoubleClick={() => onDoubleClick(save.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cell.column.columnDef.meta?.className}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            </SaveContextMenu>
          );
        })}
        {paddingBottom > 0 ? (
          <tr aria-hidden>
            <td colSpan={headerColumns} style={{ height: paddingBottom }} />
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
