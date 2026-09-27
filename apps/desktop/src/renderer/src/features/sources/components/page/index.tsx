import {
  IconCircleCheckOutline18,
  IconFileOutline18,
  IconLink2Outline18,
} from "@pond/icons/outline/18";
import { DataTable } from "@pond/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MatchesEmpty,
  SourcesEmpty,
} from "@/features/library/components/empty";
import { TableSelectionSync } from "@/features/library/components/table-selection-sync";
import { NewSourceMenu } from "@/features/sources/components/new-menu/new-menu";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useWatches } from "@/features/sources/hooks/use-watches";
import {
  sourceDetail,
  useSourceDetailRevision,
} from "@/features/sources/state/source-detail";
import {
  sourcesFilters,
  useSourcesFilters,
} from "@/features/sources/state/sources-filters";
import { sourcesSelection } from "@/features/sources/state/sources-selection";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
import { useWatchAdded, watchFlow } from "@/features/sources/state/watch-flow";
import {
  SearchChrome,
  SearchChromeInput,
} from "@/shared/components/search-chrome";
import {
  TableFilterBar,
  TableFilterChip,
  TableFilterToggle,
} from "@/shared/components/table-filters";
import { uniqueFilterOptions } from "@/shared/components/table-filters/chip-label";
import { useClientHeight } from "@/shared/hooks/use-client-height";
import { sourcesColumns } from "./columns";
import { SourcesContextMenu } from "./context-menu";
import {
  matchesSourceFilters,
  SOURCE_STATUS_OPTIONS,
  sourceFiltersActive,
} from "./lib/filters";
import {
  type SourceEntry,
  type SourceTableRow,
  toSourceTableRow,
} from "./lib/helpers";
import styles from "./styles.module.css";

function openEntry(entry: SourceEntry): void {
  if (entry.kind === "account") sourceDetail.openAccount(entry.row.id);
  else sourceDetail.openWatch(entry.row.id);
}

function SourcesMatchesEmpty() {
  return <MatchesEmpty onReset={sourcesFilters.reset} />;
}

export function SourcesPage() {
  const { accounts, loading: accountsLoading, refetch } = useAccounts();
  const {
    watches,
    loading: watchesLoading,
    refetch: refetchWatches,
  } = useWatches();
  const byAccount = useSyncByAccount();
  const addedWatchId = useWatchAdded();
  const detailRevision = useSourceDetailRevision();
  const filters = useSourcesFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { ref: tableRef, height: tableHeight } = useClientHeight();

  const entries = useMemo<SourceEntry[]>(() => {
    const next: SourceEntry[] = [];
    for (const row of accounts) next.push({ kind: "account", row });
    for (const row of watches) next.push({ kind: "watch", row });
    return next;
  }, [accounts, watches]);

  const tableRows = useMemo<SourceTableRow[]>(() => {
    const next: SourceTableRow[] = [];
    for (const entry of entries) {
      next.push(toSourceTableRow(entry, cardModel(byAccount[entry.row.id])));
    }
    return next;
  }, [entries, byAccount]);

  const rows = useMemo(
    () => tableRows.filter((row) => matchesSourceFilters(row, filters)),
    [tableRows, filters],
  );
  const sourceOptions = useMemo(
    () =>
      uniqueFilterOptions(
        tableRows.map((row) => ({ id: row.source, label: row.sourceLabel })),
      ),
    [tableRows],
  );
  const typeOptions = useMemo(
    () =>
      uniqueFilterOptions(
        tableRows.map((row) => ({ id: row.kindLabel, label: row.kindLabel })),
      ),
    [tableRows],
  );

  const rowsById = useMemo(() => {
    const next = new Map<string, SourceTableRow>();
    for (const row of rows) next.set(row.id, row);
    return next;
  }, [rows]);

  useEffect(() => {
    if (!addedWatchId) return;
    void refetchWatches();
    sourceDetail.openWatch(addedWatchId);
    watchFlow.consumeAdded();
  }, [addedWatchId, refetchWatches]);

  useEffect(() => {
    if (detailRevision === 0) return;
    void refetch();
    void refetchWatches();
  }, [detailRevision, refetch, refetchWatches]);

  const loaded = !accountsLoading && !watchesLoading;
  const showMatchesEmpty = loaded && entries.length > 0 && rows.length === 0;

  const onRowClick = useCallback((row: SourceTableRow) => {
    openEntry(row.entry);
  }, []);

  return (
    <DataTable.Provider
      data={rows}
      columns={sourcesColumns}
      getRowId={(row) => row.id}
      onSelectionChange={(ids) => {
        sourcesSelection.set(
          ids
            .map((id) => rowsById.get(id))
            .filter((row): row is SourceTableRow => row != null),
        );
      }}
      defaultSort={{ id: "name", desc: false }}
      height={
        showMatchesEmpty || tableHeight < 88 ? undefined : tableHeight - 40
      }
      rowHeight={48}
      selectionCheckboxes={false}
      onRowClick={onRowClick}
      renderRow={({ cells, rowProps, row }) => (
        <SourcesContextMenu row={row}>
          <div {...rowProps}>{cells}</div>
        </SourcesContextMenu>
      )}
    >
      <div className={styles.page}>
        <SearchChrome
          actions={
            <>
              <TableFilterToggle
                open={filtersOpen}
                active={sourceFiltersActive(filters)}
                controlsId="sources-filter-toolbar"
                onToggle={() => setFiltersOpen((open) => !open)}
              />
              <NewSourceMenu controlled />
            </>
          }
          below={
            <TableFilterBar
              open={filtersOpen}
              id="sources-filter-toolbar"
              label="Source Filters"
            >
              <TableFilterChip
                name="Status"
                icon={<IconCircleCheckOutline18 />}
                options={SOURCE_STATUS_OPTIONS}
                selected={filters.statuses}
                onChange={sourcesFilters.setStatuses}
              />
              <TableFilterChip
                name="Source"
                icon={<IconLink2Outline18 />}
                options={sourceOptions}
                selected={filters.sources}
                onChange={sourcesFilters.setSources}
              />
              <TableFilterChip
                name="Type"
                icon={<IconFileOutline18 />}
                options={typeOptions}
                selected={filters.types}
                onChange={sourcesFilters.setTypes}
              />
            </TableFilterBar>
          }
        >
          <SearchChromeInput
            value={filters.q}
            onChange={(e) => sourcesFilters.setQ(e.target.value)}
            spellCheck={false}
            placeholder="Search sources…"
            aria-label="Search Sources"
            data-sources-search=""
          />
        </SearchChrome>
        <div className={styles.content}>
          {loaded && entries.length === 0 ? (
            <SourcesEmpty />
          ) : showMatchesEmpty ? (
            <div className={styles.empty}>
              <SourcesMatchesEmpty />
            </div>
          ) : (
            <div ref={tableRef} className={styles.table}>
              <DataTable.Root className={styles.grid} aria-label="Sources">
                <DataTable.Empty>
                  {loaded ? <SourcesMatchesEmpty /> : null}
                </DataTable.Empty>
              </DataTable.Root>
            </div>
          )}
        </div>
      </div>
      <DataTable.Hotkeys />
      <TableSelectionSync selection={sourcesSelection} rowsById={rowsById} />
    </DataTable.Provider>
  );
}
