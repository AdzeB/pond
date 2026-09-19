import type { RowData } from "@tanstack/react-table";
import {
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
} from "react";
import { stop } from "./cells";
import { useDataTable } from "./context";
import styles from "./styles.module.css";
import type { HeaderContext, TableColumn } from "./types";

function HeaderCell<T extends RowData>({ column }: { column: TableColumn<T> }) {
  const { actions, meta } = useDataTable<T>();
  const headRef = useRef<HTMLDivElement>(null);
  const sortable = Boolean(column.accessor);
  const sorted = meta.getSorted(column.id);

  const content =
    column.header instanceof Function
      ? column.header({ sorted } satisfies HeaderContext)
      : (column.header ?? null);

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
        className={styles.header}
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
        className={styles.header}
        data-align={column.align}
        {...dragProps}
      >
        <span className={styles["header-static"]}>{content}</span>
        {resizeHandle}
      </div>
    );
  }

  return (
    <div
      ref={headRef}
      role="columnheader"
      className={styles.header}
      data-align={column.align}
      {...dragProps}
    >
      <button
        type="button"
        className={styles["sort-button"]}
        data-active={sorted ? true : undefined}
        aria-label={`Sort by ${column.sortLabel ?? column.id}`}
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

export function DataTableHeader<T extends RowData>() {
  const { meta } = useDataTable<T>();

  return (
    <div
      role="row"
      className={styles["header-row"]}
      style={{ gridTemplateColumns: meta.gridTemplate }}
    >
      {meta.selectionEnabled && meta.selectionCheckboxes ? (
        <div
          role="columnheader"
          className={styles["select-header"]}
          aria-hidden
        />
      ) : null}
      {meta.expansionEnabled ? (
        <div role="columnheader" className={styles.header} aria-hidden />
      ) : null}
      {meta.columns.map((col) => (
        <HeaderCell key={col.id} column={col} />
      ))}
    </div>
  );
}
