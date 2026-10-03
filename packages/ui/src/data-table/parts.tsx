import { useSelector } from "@tanstack/react-store";
import type { RowData } from "@tanstack/react-table";
import { clsx as cn } from "clsx";
import {
  Children,
  type FunctionComponent,
  isValidElement,
  type ReactNode,
  useLayoutEffect,
} from "react";
import { DataTableBody } from "./body";
import { useDataTable } from "./context";
import { DataTableHeader } from "./header";
import styles from "./styles.module.css";

interface SlotProps {
  children?: ReactNode;
}

export const DataTableEmpty: FunctionComponent<SlotProps> = () => null;
export const DataTableExtraRow: FunctionComponent<SlotProps> = () => null;

export function DataTableRoot<T extends RowData>({
  children,
  className,
  variant = "table",
  "aria-label": ariaLabel = "Records",
}: {
  children?: ReactNode;
  className?: string;
  variant?: "table" | "list";
  "aria-label"?: string;
}) {
  const { meta, selectionStore, actions } = useDataTable<T>();
  const cursorId = useSelector(selectionStore, (s) => s.cursorId);

  useLayoutEffect(() => {
    if (
      !cursorId ||
      meta.rows.some((row) => row.id === cursorId) ||
      document.activeElement !== meta.gridRef.current
    )
      return;
    const first = meta.rows[0];
    if (first) actions.focusRow(first.id);
  }, [cursorId, meta.rows, meta.gridRef, actions]);

  let extraRow: ReactNode = null;
  let emptyState: ReactNode = null;
  Children.forEach(children, (child) => {
    if (!isValidElement<SlotProps>(child)) return;
    if (child.type === DataTableExtraRow) extraRow = child.props.children;
    else if (child.type === DataTableEmpty) emptyState = child.props.children;
  });

  const hasRows = meta.rows.length > 0 || extraRow != null;
  const showHeader = variant !== "list" && hasRows;

  return (
    <div
      className={cn(styles.container, className)}
      ref={meta.gridRef}
      role="grid"
      tabIndex={0}
      onFocus={(event) => {
        if (event.target !== event.currentTarget) return;
        const cursor = selectionStore.state.cursorId;
        const id =
          cursor && meta.rows.some((row) => row.id === cursor)
            ? cursor
            : meta.rows[0]?.id;
        if (!id) return;
        actions.focusRow(id);
        meta.revealRow.current?.(id);
      }}
      aria-label={ariaLabel}
      aria-multiselectable={meta.selectionEnabled || undefined}
      aria-rowcount={meta.rowCount + (showHeader ? 1 : 0)}
      aria-colcount={
        meta.columns.length +
        Number(meta.selectionEnabled && meta.selectionCheckboxes) +
        Number(meta.expansionEnabled)
      }
      aria-activedescendant={
        cursorId && meta.rows.some((row) => row.id === cursorId)
          ? meta.rowElementId(cursorId)
          : undefined
      }
      data-list={(variant === "list" && hasRows) || undefined}
    >
      {showHeader ? <DataTableHeader<T> /> : null}
      <DataTableBody<T>
        extraRow={extraRow}
        emptyState={emptyState}
        rowOffset={showHeader ? 1 : 0}
      />
    </div>
  );
}

export function DataTableToolbar({
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

export function DataTableActionBar<T extends RowData>({
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
      {children instanceof Function ? children(selection) : children}
    </div>
  );
}

export function DataTableActionBarDivider() {
  return <span className={styles["action-bar-divider"]} aria-hidden />;
}
