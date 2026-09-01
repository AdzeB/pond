import { IconMagnifierOutline12 as Magnifier } from "@pond/icons/outline/12";
import type { MenuItemSpec } from "@pond/ui";
import { Button, DataTable, Input, Menu } from "@pond/ui";
import { useCallback, useEffect, useMemo } from "react";
import { MatchesEmpty, SourcesEmpty } from "@/components/library/empty";
import { cardModel } from "@/components/library/sources/sync-monitor/lib/helpers";
import { TableSelectionSync } from "@/components/library/table-selection-sync";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { useAccounts } from "@/hooks/use-accounts";
import { useClientHeight } from "@/hooks/use-client-height";
import { useWatches } from "@/hooks/use-watches";
import { viewAccountItems } from "@/lib/ui/open-search";
import {
  connectFlow,
  useConnectedBefore,
  useConnectWaiting,
} from "@/stores/connect-flow";
import { sourceDetail, useSourceDetailRevision } from "@/stores/source-detail";
import { sourceFlow } from "@/stores/source-flow";
import { sourcesFilters, useSourcesFilters } from "@/stores/sources-filters";
import { sourcesSelection } from "@/stores/sources-selection";
import { syncMonitor, useSyncByAccount } from "@/stores/sync-monitor";
import { useWatchAdded, watchFlow } from "@/stores/watch-flow";
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
import styles from "./styles.module.css";

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

  if (loaded && entries.length === 0) {
    return (
      <div className={styles.page}>
        <SourcesEmpty />
      </div>
    );
  }

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
        <DataTable.Toolbar className={styles.toolbar}>
          <Input.Root className={styles.search} size="sm">
            <Input.Icon>
              <Magnifier />
            </Input.Icon>
            <Input.Field
              value={filters.q}
              onChange={(e) => sourcesFilters.setQ(e.target.value)}
              spellCheck={false}
              placeholder="Find by name…"
              data-sources-search=""
            />
          </Input.Root>
          <FilterMenu
            label="Status"
            items={STATUS_OPTIONS.map((opt) => ({
              type: "checkbox",
              label: opt.label,
              checked: filters.statuses.has(opt.id),
              closeOnClick: false,
              onCheckedChange: (on) => sourcesFilters.toggleStatus(opt.id, on),
            }))}
          />
          <FilterMenu
            label="Source"
            items={SOURCE_OPTIONS.map((opt) => ({
              type: "checkbox",
              label: opt.label,
              checked: filters.sources.has(opt.id),
              closeOnClick: false,
              onCheckedChange: (on) => sourcesFilters.toggleSource(opt.id, on),
            }))}
          />
          <FilterMenu
            label="Type"
            items={KIND_OPTIONS.map((opt) => ({
              type: "checkbox",
              label: opt.label,
              checked: filters.kinds.has(opt.id),
              closeOnClick: false,
              onCheckedChange: (on) => sourcesFilters.toggleKind(opt.id, on),
            }))}
          />
          <span className={styles.spacer} />
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
        </DataTable.Toolbar>
        {showMatchesEmpty ? (
          <div className={styles.empty}>
            <MatchesEmpty />
          </div>
        ) : (
          <div ref={tableRef} className={styles.table}>
            <DataTable.Root>
              <DataTable.Empty>
                {loaded ? <MatchesEmpty /> : null}
              </DataTable.Empty>
            </DataTable.Root>
          </div>
        )}
      </div>
      <TableSelectionSync selection={sourcesSelection} rowsById={rowsById} />
    </DataTable.Provider>
  );
}
