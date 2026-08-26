// biome-ignore-all lint/a11y/useSemanticElements: custom CSS-grid table uses ARIA grid roles by design.

import { useSelector } from "@tanstack/react-store";
import { clsx as cn } from "clsx";
import { Children, isValidElement, type ReactNode } from "react";
import { DataTableBody } from "./body";
import { useDataTable } from "./context";
import { DataTableHeader } from "./header";
import styles from "./styles.module.css";

export function DataTableEmpty(_: { children?: ReactNode }): null {
  return null;
}
export function DataTableExtraRow(_: { children?: ReactNode }): null {
  return null;
}

export function DataTableRoot<T>({
  children,
  className,
  variant = "table",
}: {
  children?: ReactNode;
  className?: string;
  variant?: "table" | "list";
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

  const hasRows = meta.rows.length > 0 || extraRow != null;
  const showHeader = variant !== "list" && hasRows;

  return (
    <div
      className={cn(styles.container, className)}
      role="grid"
      data-list={(variant === "list" && hasRows) || undefined}
    >
      {showHeader ? <DataTableHeader<T> /> : null}
      <DataTableBody<T> extraRow={extraRow} emptyState={emptyState} />
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

export function DataTableActionBar<T>({
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

export function DataTableActionBarDivider() {
  return <span className={styles["action-bar-divider"]} aria-hidden />;
}
