import {
  createTableColumnLayout,
  type TableColumnLayout,
  type TableSort,
} from "@/shared/lib/table-column-layout";
import {
  DOWNLOAD_COLUMN_CATALOG,
  type DownloadColumnId,
  LOCKED_DOWNLOAD_COLUMN,
} from "../lib/download-columns";

export type DownloadsTableSort = TableSort<DownloadColumnId>;
export type DownloadsColumnLayout = TableColumnLayout<DownloadColumnId>;

const layout = createTableColumnLayout({
  storageKey: "pond:downloads-columns",
  columns: DOWNLOAD_COLUMN_CATALOG,
  lockedId: LOCKED_DOWNLOAD_COLUMN,
});

export function defaultDownloadsColumnLayout(): DownloadsColumnLayout {
  return layout.defaultLayout();
}

export function normalizeDownloadsColumnLayout(
  value: unknown,
): DownloadsColumnLayout {
  return layout.normalize(value);
}

export function mergeVisibleColumnOrder(
  order: readonly DownloadColumnId[],
  hidden: readonly DownloadColumnId[],
  visibleOrder: readonly string[],
): DownloadColumnId[] {
  return layout.mergeVisibleOrder(order, hidden, visibleOrder);
}

export const downloadsColumnsLayout = {
  snapshot: layout.snapshot,
  setHidden: layout.setHidden,
  setSort: layout.setSort,
  applyVisibleOrder: layout.applyVisibleOrder,
  reset: layout.reset,
};

export function useDownloadsColumnLayout(): DownloadsColumnLayout {
  return layout.useLayout();
}
