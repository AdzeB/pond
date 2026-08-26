import type { MenuItemSpec } from "@pond/ui";
import { type CSSProperties, useEffect, useMemo } from "react";
import { SourcesEmpty } from "@/components/library/empty";
import {
  LIBRARY_ITEM_GAP,
  PackedGrid,
  type PackedItem,
  packUniform,
} from "@/components/library/layouts/packed-grid";
import {
  type CardModel,
  cardModel,
} from "@/components/library/sources/sync-monitor/lib/helpers";
import { type AccountRow, useAccounts } from "@/hooks/use-accounts";
import { useGridMin } from "@/hooks/use-grid-min";
import { useWatches, type WatchRow } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { viewAccountItems } from "@/lib/ui/open-search";
import {
  connectFlow,
  useConnectedBefore,
  useConnectWaiting,
} from "@/stores/connect-flow";
import { useGridWidth } from "@/stores/shell-state";
import { sourceDetail, useSourceDetailRevision } from "@/stores/source-detail";
import { syncMonitor, useSyncByAccount } from "@/stores/sync-monitor";
import { useWatchAdded, watchFlow } from "@/stores/watch-flow";
import { buildAccountMenu } from "./lib/account-menu";
import { syncFraction, tileValue, watchName } from "./lib/helpers";
import { SourceTile } from "./source-tile";
import styles from "./styles.module.css";

const SOURCE_CELL_HEIGHT = 120;

type SourceEntry =
  | { kind: "account"; row: AccountRow }
  | { kind: "watch"; row: WatchRow };

function cellStyle(item: PackedItem): CSSProperties {
  return {
    position: "absolute",
    top: `${item.top}px`,
    left: `${item.left}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
  };
}

function entryName(entry: SourceEntry): string {
  if (entry.kind === "account") {
    return entry.row.label ?? getSourceDef(entry.row.source).label;
  }
  return watchName(entry.row);
}

function openEntry(entry: SourceEntry): void {
  if (entry.kind === "account") sourceDetail.openAccount(entry.row.id);
  else sourceDetail.openWatch(entry.row.id);
}

function buildTileMenu(entry: SourceEntry, model: CardModel): MenuItemSpec[] {
  const running = model.tone === "run";
  const now =
    entry.kind === "account"
      ? { label: "Sync Now", disabled: !(model.connected && !running) }
      : { label: "Check Now", disabled: running };
  return [
    { ...now, onClick: () => void window.pond.syncRunNow(entry.row.id) },
    {
      label: "View Items in Library",
      onClick: () => viewAccountItems(entry.row.id),
    },
    ...(entry.kind === "account"
      ? [{ type: "separator" as const }, ...buildAccountMenu(entry.row, model)]
      : []),
  ];
}

export function SourcesPage() {
  const { accounts, loading: accountsLoading, refetch } = useAccounts();
  const {
    watches,
    loading: watchesLoading,
    refetch: refetchWatches,
  } = useWatches();
  const byAccount = useSyncByAccount();
  const width = useGridWidth();
  const colMin = useGridMin();
  const waiting = useConnectWaiting();
  const connectedBefore = useConnectedBefore();
  const addedWatchId = useWatchAdded();
  const detailRevision = useSourceDetailRevision();

  const entries = useMemo<SourceEntry[]>(() => {
    const next: SourceEntry[] = [];
    for (const row of accounts) next.push({ kind: "account", row });
    for (const row of watches) next.push({ kind: "watch", row });
    return next;
  }, [accounts, watches]);

  const byId = useMemo(() => {
    const map = new Map<string, SourceEntry>();
    for (const entry of entries) map.set(entry.row.id, entry);
    return map;
  }, [entries]);

  const { items, totalHeight } = useMemo(
    () =>
      packUniform(
        entries.map((e) => e.row.id),
        width,
        colMin,
        LIBRARY_ITEM_GAP,
        SOURCE_CELL_HEIGHT,
      ),
    [entries, width, colMin],
  );

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
          const rows = await refetch();
          if (cancelled || arrivedOnce) return;
          const arrived = rows.find(
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

  if (!accountsLoading && !watchesLoading && entries.length === 0) {
    return <SourcesEmpty />;
  }

  return (
    <div className={styles.root}>
      <PackedGrid
        layout="grid"
        items={items}
        totalHeight={totalHeight}
        renderItem={(item) => {
          const entry = byId.get(item.id);
          if (!entry) return null;
          const status = byAccount[entry.row.id];
          const model = cardModel(status);
          return (
            <li key={item.id} className={styles.cell} style={cellStyle(item)}>
              <SourceTile
                source={entry.row.source}
                avatarUrl={entry.row.avatarUrl}
                name={entryName(entry)}
                value={tileValue(
                  model.tone,
                  model.statusText,
                  entry.row.sync?.knownCount ?? 0,
                )}
                tone={model.tone}
                progress={syncFraction(model.tone, status)}
                onOpen={() => openEntry(entry)}
                menu={() => buildTileMenu(entry, model)}
              />
            </li>
          );
        }}
      />
    </div>
  );
}
