// biome-ignore-all lint/a11y/useSemanticElements: custom CSS-grid table uses ARIA grid roles by design.

import type { Row as TanstackRow } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useRef } from "react";
import { useDataTable } from "./context";
import { Row } from "./row";
import styles from "./styles.module.css";

export function DataTableBody<T>({
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
