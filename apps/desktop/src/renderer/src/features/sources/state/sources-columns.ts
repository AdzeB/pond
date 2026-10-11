import { createTableColumnLayout } from "@/shared/lib/table-column-layout";

export const SOURCE_COLUMN_CATALOG = [
  { id: "name", label: "Name" },
  { id: "items", label: "Items" },
  { id: "lastSynced", label: "Last Synced" },
  { id: "status", label: "Status" },
  { id: "source", label: "Source" },
  { id: "type", label: "Type" },
] as const;

export type SourceColumnId = (typeof SOURCE_COLUMN_CATALOG)[number]["id"];

export const LOCKED_SOURCE_COLUMN: SourceColumnId = "name";

const DEFAULT_SORT = { id: "name" as const, desc: false };

const layout = createTableColumnLayout({
  storageKey: "pond:sources-columns",
  columns: SOURCE_COLUMN_CATALOG,
  lockedId: LOCKED_SOURCE_COLUMN,
  defaultSort: DEFAULT_SORT,
});

export const sourcesColumnsLayout = {
  snapshot: layout.snapshot,
  setHidden: layout.setHidden,
  setSort: layout.setSort,
  applyVisibleOrder: layout.applyVisibleOrder,
  reset: layout.reset,
};

export function useSourcesColumnLayout() {
  return layout.useLayout();
}

export const SOURCES_DEFAULT_SORT = DEFAULT_SORT;
