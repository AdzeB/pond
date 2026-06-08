import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type RowData,
  type SortingFn,
  type SortingState,
  type Updater,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type GridLayout, LibraryGrid } from "@/components/library";
import { JustifiedView } from "@/components/library/justified";
import { SaveCard } from "@/components/library/save-card";
import { WaterfallView } from "@/components/library/waterfall";
import { Card, type CardLayout } from "@/components/primitives/card-thumb";
import { SaveContextMenu } from "@/components/primitives/menus/save-context";
import { setSort, useSortDir, useSortKey } from "@/lib/stores/view-store";
import { formatAbsolute, formatBytes } from "@/lib/utils/format";
import type { Save } from "@/pool/types";
import styles from "./styles.module.css";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

export type ViewMode = "waterfall" | "justified" | "grid" | "list";

interface LayoutSwitcherProps {
  viewMode: ViewMode;
  saves: ReadonlyArray<Save>;
  selectedId: string | null;
  multiSelectActive: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (id: string) => void;
}

export function LayoutSwitcher(props: LayoutSwitcherProps) {
  const {
    viewMode,
    saves,
    selectedId,
    multiSelectActive,
    onClick,
    onDoubleClick,
  } = props;

  const renderJustifiedCard = useCallback(
    (
      save: Save,
      packed: { top: number; left: number; width: number; height: number },
    ) => (
      <SaveCard
        key={save.id}
        id={save.id}
        layout="justified"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        packedWidth={packed.width}
        packedHeight={packed.height}
        packedTop={packed.top}
        packedLeft={packed.left}
      />
    ),
    [onClick, onDoubleClick],
  );

  const renderWaterfallCard = useCallback(
    (
      save: Save,
      packed: { top: number; left: number; width: number; height: number },
    ) => (
      <SaveCard
        key={save.id}
        id={save.id}
        layout="waterfall"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        packedWidth={packed.width}
        packedHeight={packed.height}
        packedTop={packed.top}
        packedLeft={packed.left}
      />
    ),
    [onClick, onDoubleClick],
  );

  if (viewMode === "list") {
    return (
      <ListView
        saves={saves}
        selectedId={selectedId}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    );
  }
  if (viewMode === "justified") {
    return (
      <JustifiedView
        saves={saves}
        multiSelectActive={multiSelectActive}
        renderCard={renderJustifiedCard}
      />
    );
  }
  if (viewMode === "waterfall") {
    return (
      <WaterfallView
        saves={saves}
        multiSelectActive={multiSelectActive}
        renderCard={renderWaterfallCard}
      />
    );
  }
  return (
    <LibraryGrid.Grid
      layout={viewMode as GridLayout}
      multiSelect={multiSelectActive}
    >
      {saves.map((save) => (
        <SaveCard
          key={save.id}
          id={save.id}
          layout={viewMode as CardLayout}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      ))}
    </LibraryGrid.Grid>
  );
}

type SortKey =
  | "title"
  | "tags"
  | "dimensions"
  | "extension"
  | "fileSize"
  | "savedAt";

const SORT_KEYS = new Set<SortKey>([
  "title",
  "tags",
  "dimensions",
  "extension",
  "fileSize",
  "savedAt",
]);

// Locale-aware string comparator. TanStack's built-in `text` sorting fn
// uses an alphanumeric chunked comparison that diverges from plain
// localeCompare; this preserves the old ordering.
const localeSort: SortingFn<Save> = (a, b, columnId) => {
  const va = a.getValue<string>(columnId);
  const vb = b.getValue<string>(columnId);
  return va.localeCompare(vb);
};

function ListView({
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

  // First-click direction policy lives on each column's `sortDescFirst`.
  // We just mirror TanStack's state back into the view store.
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

  const columns = useMemo(() => {
    const helper = createColumnHelper<Save>();
    return [
      helper.display({
        id: "thumbnail",
        header: () => null,
        cell: ({ row }) => (
          <span className={styles["list-thumb"]}>
            <Card.Root save={row.original}>
              <Card.Media />
              <Card.DownloadingBadge />
            </Card.Root>
          </span>
        ),
        enableSorting: false,
        meta: { className: styles["col-thumb"] },
      }),
      helper.accessor((save) => (save.title ?? save.url ?? "").toLowerCase(), {
        id: "title",
        header: "Name",
        cell: ({ row }) => row.original.title ?? row.original.url,
        sortingFn: localeSort,
        sortDescFirst: false,
        meta: { className: styles["col-name"] },
      }),
      helper.accessor((save) => save.tags.join(",").toLowerCase(), {
        id: "tags",
        header: "Tags",
        cell: ({ row }) => {
          const save = row.original;
          if (save.tags.length === 0) {
            return <span className={styles["col-muted"]}>-</span>;
          }
          return (
            <span className={styles["tag-chips"]}>
              {save.tags.slice(0, 6).map((t) => (
                <span key={t} className={styles["tag-chip"]}>
                  {t}
                </span>
              ))}
              {save.tags.length > 6 ? (
                <span className={styles["tag-chip-more"]}>
                  +{save.tags.length - 6}
                </span>
              ) : null}
            </span>
          );
        },
        sortingFn: localeSort,
        sortDescFirst: false,
        meta: { className: styles["col-tags"] },
      }),
      helper.accessor(
        (save) => {
          const cover = save.files[save.coverIndex ?? 0];
          const w = cover?.width ?? save.width ?? null;
          const h = cover?.height ?? save.height ?? null;
          return w && h ? w * h : undefined;
        },
        {
          id: "dimensions",
          header: "Dimensions",
          cell: ({ row }) => {
            const save = row.original;
            const cover = save.files[save.coverIndex ?? 0];
            if (cover?.width && cover?.height) {
              return `${cover.width} × ${cover.height}`;
            }
            if (save.width && save.height) {
              return `${save.width} × ${save.height}`;
            }
            return "-";
          },
          sortingFn: "basic",
          sortUndefined: "last",
          sortDescFirst: false,
          meta: { className: styles["col-dim"] },
        },
      ),
      helper.accessor((save) => extensionFor(save), {
        id: "extension",
        header: "Extension",
        cell: ({ row }) => {
          const ext = extensionFor(row.original).toUpperCase();
          return ext ? <span className={styles["ext-chip"]}>{ext}</span> : "-";
        },
        sortingFn: localeSort,
        sortDescFirst: false,
        meta: { className: styles["col-ext"] },
      }),
      helper.accessor(
        (save) => {
          const cover = save.files[save.coverIndex ?? 0];
          const v = cover?.size ?? save.fileSize ?? null;
          return v == null ? undefined : v;
        },
        {
          id: "fileSize",
          header: "File Size",
          cell: ({ row }) => {
            const save = row.original;
            const cover = save.files[save.coverIndex ?? 0];
            return formatBytes(cover?.size ?? save.fileSize ?? null);
          },
          sortingFn: "basic",
          sortUndefined: "last",
          sortDescFirst: true,
          meta: { className: styles["col-size"] },
        },
      ),
      helper.accessor(
        (save) => {
          const t = new Date(save.savedAt).getTime();
          return Number.isFinite(t) ? t : undefined;
        },
        {
          id: "savedAt",
          header: "Date Added",
          cell: ({ row }) => formatAbsolute(row.original.savedAt),
          sortingFn: "basic",
          sortUndefined: "last",
          sortDescFirst: true,
          meta: { className: styles["col-date"] },
        },
      ),
    ];
  }, []);

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
    let node: HTMLElement | null = tableRef.current?.parentElement ?? null;
    while (node) {
      const style = getComputedStyle(node);
      const oy = style.overflowY;
      if (oy === "auto" || oy === "scroll" || oy === "overlay") break;
      node = node.parentElement;
    }
    setScrollParent(node);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    // Row height = thumbnail (24) + vertical padding (6 + 6) + 1px
    // border. Used as the initial estimate; real heights are
    // measured per row to handle wrapping titles or tag chips.
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

function extensionFor(save: Save): string {
  const cover = save.files[save.coverIndex ?? 0];
  if (cover?.path) {
    const m = /\.([a-z0-9]+)$/i.exec(cover.path);
    if (m?.[1]) return m[1].toLowerCase();
  }
  if (cover?.mimeType) {
    const m = /^[^/]+\/(.+)$/.exec(cover.mimeType);
    if (m?.[1]) return m[1].toLowerCase();
  }
  return "";
}
