// biome-ignore-all lint/a11y/useSemanticElements: custom CSS-grid table uses ARIA grid roles by design.

import { useSelector } from "@tanstack/react-store";
import { clsx as cn } from "clsx";
import {
  Children,
  type FunctionComponent,
  isValidElement,
  type ReactNode,
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
    if (!isValidElement<SlotProps>(child)) return;
    if (child.type === DataTableExtraRow) extraRow = child.props.children;
    else if (child.type === DataTableEmpty) emptyState = child.props.children;
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
      {children instanceof Function ? children(selection) : children}
    </div>
  );
}

export function DataTableActionBarDivider() {
  return <span className={styles["action-bar-divider"]} aria-hidden />;
}
