import { DataTable, type RenderRowArgs, useDataTable } from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
import { useCallback, useEffect, useMemo } from "react";
import { downloadActivityForSave } from "../../lib/download-progress";
import type { DownloadRow } from "../../lib/status-feed";
import { downloadsSelection } from "../../state/downloads-selection";
import { DownloadQueueRow, downloadsColumns } from "./columns";
import styles from "./page.module.css";

function SelectionSync({ rowsById }: { rowsById: Map<string, DownloadRow> }) {
  const { actions, selectionStore } = useDataTable<DownloadRow>();
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
  now,
  inspectedId,
  onInspect,
  header = false,
}: {
  rows: DownloadRow[];
  paused: boolean;
  activities: readonly DownloadActivity[];
  now: number;
  inspectedId: string | null;
  onInspect: (row: DownloadRow) => void;
  header?: boolean;
}) {
  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const renderRow = useCallback(
    (args: RenderRowArgs<DownloadRow>) => (
      <DownloadQueueRow
        {...args}
        paused={paused}
        activity={downloadActivityForSave(activities, args.row.saveId)}
        now={now}
        inspected={args.row.saveId === inspectedId}
      />
    ),
    [paused, activities, now, inspectedId],
  );
  return (
    <DataTable.Provider
      data={rows}
      columns={downloadsColumns}
      getRowId={(row) => row.id}
      rowHeight={48}
      height={rows.length > 11 ? 528 : undefined}
      selectionCheckboxes={false}
      onRowClick={onInspect}
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
      <DataTable.Root
        className={styles.grid}
        variant={header ? "table" : "list"}
      />
      <SelectionSync rowsById={rowsById} />
    </DataTable.Provider>
  );
}
