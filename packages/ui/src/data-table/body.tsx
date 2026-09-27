import { useSelector } from "@tanstack/react-store";
import type { RowData, Row as TanstackRow } from "@tanstack/react-table";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cssVars } from "../css-vars";
import { useDataTable } from "./context";
import type { DATA_TABLE_FEATURES } from "./provider";
import { Row } from "./row";
import styles from "./styles.module.css";

type ScrollEdges = "" | "start" | "end" | "start end";

function scrollEdgesOf(element: HTMLDivElement): ScrollEdges {
  const start = element.scrollTop > 1;
  const end =
    element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  if (start && end) return "start end";
  if (start) return "start";
  return end ? "end" : "";
}

export function DataTableBody<T extends RowData>({
  extraRow,
  emptyState,
  rowOffset = 1,
}: {
  extraRow?: ReactNode;
  emptyState?: ReactNode;
  rowOffset?: number;
}) {
  const { meta, selectionStore } = useDataTable<T>();
  const { rows, rowApi, height, rowHeight, overscan } = meta;

  const cursorId = useSelector(selectionStore, (s) => s.cursorId);
  const cursorIndex = rows.findIndex((row) => row.id === cursorId);
  const parentRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<ScrollEdges>("");
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range);
      if (cursorIndex >= 0 && !indexes.includes(cursorIndex))
        indexes.push(cursorIndex);
      return indexes.sort((a, b) => a - b);
    },
    enabled: height !== undefined,
  });

  const revealRow = useCallback(
    (id: string) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) return;
      if (height !== undefined)
        virtualizer.scrollToIndex(index, { align: "auto" });
      else
        document
          .getElementById(meta.rowElementId(id))
          ?.scrollIntoView?.({ block: "nearest" });
    },
    [rows, height, meta.rowElementId, virtualizer],
  );

  useLayoutEffect(() => {
    meta.revealRow.current = revealRow;
    return () => {
      if (meta.revealRow.current === revealRow) meta.revealRow.current = null;
    };
  }, [meta.revealRow, revealRow]);

  useLayoutEffect(() => {
    if (cursorId && document.activeElement === meta.gridRef.current)
      revealRow(cursorId);
  }, [cursorId, meta.gridRef, revealRow]);

  useLayoutEffect(() => {
    if (height === undefined) return;
    const element = parentRef.current;
    if (!element) return;
    const update = () =>
      setEdges((prev) => {
        const next = scrollEdgesOf(element);
        return prev === next ? prev : next;
      });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
    if (element.firstElementChild) {
      resizeObserver.observe(element.firstElementChild);
    }
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      element.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [height]);

  const renderRow = (
    row: TanstackRow<typeof DATA_TABLE_FEATURES, T>,
    index: number,
  ) => (
    <Row
      key={row.id}
      api={rowApi}
      rowId={row.id}
      rowIndex={index + rowOffset + 1}
      prevId={rows[index - 1]?.id}
      nextId={rows[index + 1]?.id}
      data={row.original}
      depth={row.depth}
      expanded={row.getIsExpanded()}
      canExpand={row.getCanExpand()}
    />
  );

  const rowHeightStyle = cssVars({
    "--data-table-row-height": `${rowHeight}px`,
  });

  if (height !== undefined) {
    return (
      <div
        ref={parentRef}
        className={styles.body}
        role="rowgroup"
        style={{ height, overflow: "auto", ...rowHeightStyle }}
        data-scroll-fade="y"
        data-scrollable={edges}
      >
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
                  height: `${vi.size}px`,
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                {renderRow(row, vi.index)}
              </div>
            );
          })}
        </div>
        {extraRow}
      </div>
    );
  }

  return (
    <div className={styles.body} role="rowgroup" style={rowHeightStyle}>
      {rows.length === 0
        ? (extraRow ?? emptyState)
        : rows.map((row, index) => renderRow(row, index))}
      {rows.length > 0 ? extraRow : null}
    </div>
  );
}
