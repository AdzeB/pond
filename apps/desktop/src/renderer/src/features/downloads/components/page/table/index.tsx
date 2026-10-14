import { DataTable, type RenderRowArgs, useDataTable } from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { DOWNLOAD_COLUMN_CATALOG } from "../../../lib/download-columns";
import { downloadActivityForSave } from "../../../lib/download-progress";
import type { DownloadRow } from "../../../lib/status-feed";
import {
  downloadsColumnsLayout,
  useDownloadsColumnLayout,
} from "../../../state/downloads-columns";
import { downloadsSelection } from "../../../state/downloads-selection";
import {
  DownloadQueueRow,
  type DownloadViewRow,
  downloadsColumns,
} from "../columns";
import { openDownloadSave } from "../context-menu";
import styles from "./styles.module.css";

function SelectionSync({ rowsById }: { rowsById: Map<string, DownloadRow> }) {
  const { actions, selectionStore } = useDataTable<DownloadViewRow>();
  useEffect(() => {
    const sync = () => {
      const ids = downloadsSelection
        .snapshot()
        .filter((row) => rowsById.has(row.id))
        .map((row) => row.id);
      const selected = selectionStore.state.selectedIds;
      if (ids.length !== selected.size || ids.some((id) => !selected.has(id))) {
        actions.replaceSelection(ids);
      }
    };
    sync();
    return downloadsSelection.subscribe(sync);
  }, [actions, selectionStore, rowsById]);
  return null;
}

export function DownloadTable({
  rows,
  paused,
  activities,
  height,
  extra,
}: {
  rows: DownloadRow[];
  paused: boolean;
  activities: readonly DownloadActivity[];
  height?: number;
  extra?: ReactNode;
}) {
  const viewRows = useMemo<DownloadViewRow[]>(
    () =>
      rows.map((row) => ({
        ...row,
        paused,
        activity: downloadActivityForSave(activities, row.saveId),
      })),
    [rows, paused, activities],
  );
  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const renderRow = useCallback(
    (args: RenderRowArgs<DownloadViewRow>) => <DownloadQueueRow {...args} />,
    [],
  );
  const layout = useDownloadsColumnLayout();
  const columns = useMemo(
    () =>
      downloadsColumns.filter(
        (column) => !layout.hidden.some((id) => id === column.id),
      ),
    [layout.hidden],
  );
  const columnOrder = useMemo(
    () =>
      layout.order.filter((id) => columns.some((column) => column.id === id)),
    [columns, layout.order],
  );
  return (
    <DataTable.Provider
      data={viewRows}
      columns={columns}
      columnOrder={columnOrder}
      onColumnOrderChange={(order) =>
        downloadsColumnsLayout.applyVisibleOrder(order)
      }
      sorting={layout.sort}
      onSortingChange={(sort) => {
        const column = DOWNLOAD_COLUMN_CATALOG.find(
          (item) => item.id === sort?.id,
        );
        downloadsColumnsLayout.setSort(
          sort && column ? { id: column.id, desc: sort.desc } : null,
        );
      }}
      getRowId={(row) => row.id}
      height={height}
      selectionCheckboxes={false}
      selectOnClick
      onRowClick={(row, event) => {
        if (event && event.detail < 2) return;
        const current = rowsById.get(row.id);
        if (current) openDownloadSave(current);
      }}
      renderRow={renderRow}
      onSelectionChange={(ids) => {
        const other = downloadsSelection
          .snapshot()
          .filter((row) => !rowsById.has(row.id));
        const selected = ids.flatMap((id) => {
          const row = rowsById.get(id);
          return row ? [row] : [];
        });
        downloadsSelection.set([...other, ...selected]);
      }}
    >
      <DataTable.Hotkeys />
      <DataTable.Root className={styles.grid} aria-label="Downloads">
        {extra ? <DataTable.ExtraRow>{extra}</DataTable.ExtraRow> : null}
      </DataTable.Root>
      <SelectionSync rowsById={rowsById} />
    </DataTable.Provider>
  );
}
