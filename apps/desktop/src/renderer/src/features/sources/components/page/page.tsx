import type { MenuItemSpec } from "@pond/ui";
import { Button, DataTable, Menu } from "@pond/ui";
import { useCallback, useEffect, useMemo } from "react";
import {
  MatchesEmpty,
  SourcesEmpty,
} from "@/features/library/components/empty/empty";
import { TableSelectionSync } from "@/features/library/components/table-selection-sync";
import { viewAccountItems } from "@/features/search/lib/open-search";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useWatches } from "@/features/sources/hooks/use-watches";
import {
  connectFlow,
  useConnectedBefore,
  useConnectWaiting,
} from "@/features/sources/state/connect-flow";
import {
  sourceDetail,
  useSourceDetailRevision,
} from "@/features/sources/state/source-detail";
import { sourceFlow } from "@/features/sources/state/source-flow";
import {
  sourcesFilters,
  useSourcesFilters,
} from "@/features/sources/state/sources-filters";
import { sourcesSelection } from "@/features/sources/state/sources-selection";
import {
  syncMonitor,
  useSyncByAccount,
} from "@/features/sources/state/sync-monitor";
import { useWatchAdded, watchFlow } from "@/features/sources/state/watch-flow";
import {
  SearchChrome,
  SearchChromeInput,
} from "@/shared/components/search-chrome/search-chrome";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { useClientHeight } from "@/shared/hooks/use-client-height";
import { sourcesColumns } from "./columns";
import { buildAccountMenu } from "./lib/account-menu";
import {
  KIND_OPTIONS,
  matchesSourceFilters,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
} from "./lib/filters";
import {
  type SourceEntry,
  type SourceTableRow,
  sourceCanSyncNow,
  toSourceTableRow,
} from "./lib/helpers";
import styles from "./page.module.css";

function openEntry(entry: SourceEntry): void {
  if (entry.kind === "account") sourceDetail.openAccount(entry.row.id);
  else sourceDetail.openWatch(entry.row.id);
}

function buildRowMenu(row: SourceTableRow): MenuItemSpec[] {
  const now =
    row.kind === "account"
      ? { label: "Sync Now", disabled: !sourceCanSyncNow(row) }
      : { label: "Check Now", disabled: !sourceCanSyncNow(row) };
  return [
    { ...now, onClick: () => void window.pond.syncRunNow(row.id) },
    {
      label: "View Items in Library",
      onClick: () => viewAccountItems(row.id),
    },
    ...(row.entry.kind === "account"
      ? [
          { type: "separator" as const },
          ...buildAccountMenu(row.entry.row, row.model),
        ]
      : []),
  ];
}

function FilterMenu({
  label,
  items,
}: {
  label: string;
  items: MenuItemSpec[];
}) {
  return (
    <Menu.Root>
      <Menu.Trigger variant="secondary" size="sm">
        {label}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" side="bottom">
          <Menu.Popup>
            <Menu.Items items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function SourcesPage() {
  const { accounts, loading: accountsLoading, refetch } = useAccounts();
  const {
    watches,
    loading: watchesLoading,
    refetch: refetchWatches,
  } = useWatches();
  const byAccount = useSyncByAccount();
  const waiting = useConnectWaiting();
  const connectedBefore = useConnectedBefore();
  const addedWatchId = useWatchAdded();
  const detailRevision = useSourceDetailRevision();
  const filters = useSourcesFilters();
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

  const rowsById = useMemo(() => {
    const next = new Map<string, SourceTableRow>();
    for (const row of rows) next.set(row.id, row);
    return next;
  }, [rows]);

  useEffect(() => {
    if (!waiting) return;
    const source = waiting;
    let cancelled = false;
    let arrivedOnce = false;
    let inflight = false;

    const tick = () => {
      if (cancelled || arrivedOnce || inflight) return;
      inflight = true;
      void (async () => {
        try {
          const list = await refetch();
          if (cancelled || arrivedOnce) return;
          const arrived = list.find(
            (a) =>
              a.source === source && a.connected && !connectedBefore.has(a.id),
          );
          if (!arrived) return;
          arrivedOnce = true;
          syncMonitor.seed(arrived.id, source, { connected: true });
          void window.pond.syncRunNow(arrived.id);
          connectFlow.complete();
          window.setTimeout(() => {
            if (cancelled) return;
            connectFlow.clear();
            sourceDetail.openAccount(arrived.id);
          }, 1100);
        } catch {
        } finally {
          inflight = false;
        }
      })();
    };

    tick();
    const timer = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [waiting, connectedBefore, refetch]);

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
        showMatchesEmpty || tableHeight < 76 ? undefined : tableHeight - 28
      }
      onRowClick={onRowClick}
      renderRow={({ cells, rowProps, row }) => (
        <SpecContextMenu buildItems={() => buildRowMenu(row)}>
          <div {...rowProps}>{cells}</div>
        </SpecContextMenu>
      )}
    >
      <div className={styles.page}>
        <SearchChrome
          actions={
            <>
              <FilterMenu
                label="Status"
                items={STATUS_OPTIONS.map((opt) => ({
                  type: "checkbox",
                  label: opt.label,
                  checked: filters.statuses.has(opt.id),
                  closeOnClick: false,
                  onCheckedChange: (on) =>
                    sourcesFilters.toggleStatus(opt.id, on),
                }))}
              />
              <FilterMenu
                label="Source"
                items={SOURCE_OPTIONS.map((opt) => ({
                  type: "checkbox",
                  label: opt.label,
                  checked: filters.sources.has(opt.id),
                  closeOnClick: false,
                  onCheckedChange: (on) =>
                    sourcesFilters.toggleSource(opt.id, on),
                }))}
              />
              <FilterMenu
                label="Type"
                items={KIND_OPTIONS.map((opt) => ({
                  type: "checkbox",
                  label: opt.label,
                  checked: filters.kinds.has(opt.id),
                  closeOnClick: false,
                  onCheckedChange: (on) =>
                    sourcesFilters.toggleKind(opt.id, on),
                }))}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void window.pond.syncRunAll()}
              >
                Sync All
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => sourceFlow.open("source-new")}
              >
                New Source
              </Button>
            </>
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
              <MatchesEmpty onReset={sourcesFilters.reset} />
            </div>
          ) : (
            <div ref={tableRef} className={styles.table}>
              <DataTable.Root>
                <DataTable.Empty>
                  {loaded ? (
                    <MatchesEmpty onReset={sourcesFilters.reset} />
                  ) : null}
                </DataTable.Empty>
              </DataTable.Root>
            </div>
          )}
        </div>
      </div>
      <TableSelectionSync selection={sourcesSelection} rowsById={rowsById} />
    </DataTable.Provider>
  );
}
