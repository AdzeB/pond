import type { Source } from "@pond/schema/db";
import type { MenuItemSpec } from "@pond/ui";
import React, { useEffect, useMemo, useState } from "react";
import { LibraryGrid } from "@/components/library-grid";
import {
  LIBRARY_ITEM_GAP,
  PackedGrid,
  type PackedItem,
  packUniform,
} from "@/components/library-packed-grid";
import {
  type CardModel,
  cardModel,
} from "@/components/library-sync-monitor/lib/helpers";
import { SpecContextMenu } from "@/components/spec-context-menu";
import { type AccountRow, useAccounts } from "@/hooks/use-accounts";
import { useGridMin } from "@/hooks/use-grid-min";
import { useWatches, type WatchRow } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { getAppRouter } from "@/lib/ui/app-router";
import {
  connectFlow,
  useConnectedBefore,
  useConnectWaiting,
} from "@/stores/connect-flow";
import { useGridWidth } from "@/stores/shell-state";
import { sourceDetail, useSourceDetailRevision } from "@/stores/source-detail";
import { syncMonitor, useSyncByAccount } from "@/stores/sync-monitor";
import { setSearchInput } from "@/stores/view-store";
import { useWatchAdded, watchFlow } from "@/stores/watch-flow";
import { buildAccountMenu } from "./lib/account-menu";
import { itemCount, syncFraction, watchName } from "./lib/helpers";
import styles from "./styles.module.css";

/** Avatar + name + meta chrome; columns follow library `--grid-min`, height stays tile-sized. */
const SOURCE_CELL_HEIGHT = 120;

type SourceEntry =
  | { kind: "account"; row: AccountRow }
  | { kind: "watch"; row: WatchRow };

function viewItemsFor(id: string): void {
  setSearchInput([{ field: "account", operator: "eq", value: id }], "");
  void getAppRouter()?.navigate({ to: "/" });
}

function buildAccountTileMenu(
  account: AccountRow,
  model: CardModel,
): MenuItemSpec[] {
  return [
    {
      label: "Sync Now",
      disabled: !(model.connected && model.tone !== "run"),
      onClick: () => void window.pond.syncRunNow(account.id),
    },
    {
      label: "View Items in Library",
      onClick: () => viewItemsFor(account.id),
    },
    { type: "separator" },
    ...buildAccountMenu(account, model),
  ];
}

function buildWatchTileMenu(watch: WatchRow, model: CardModel): MenuItemSpec[] {
  return [
    {
      label: "Check Now",
      disabled: model.tone === "run",
      onClick: () => void window.pond.syncRunNow(watch.id),
    },
    {
      label: "View Items in Library",
      onClick: () => viewItemsFor(watch.id),
    },
  ];
}

function cellStyle(item: PackedItem): React.CSSProperties {
  return {
    position: "absolute",
    top: `${item.top}px`,
    left: `${item.left}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
  };
}

export function SourcesPage() {
  const { accounts, refetch } = useAccounts();
  const { watches, refetch: refetchWatches } = useWatches();
  const byAccount = useSyncByAccount();
  const width = useGridWidth();
  const colMin = useGridMin();
  /** Connect and watch flows live in the dock tray; this page polls for the outcome and opens the detail card. */
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

  /** Poll the registry until the extension delivers the session, then kick that account's first sync. */
  useEffect(() => {
    if (!waiting) return;
    const source = waiting;
    let cancelled = false;
    let arrivedOnce = false;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const rows = await refetch();
          if (cancelled || arrivedOnce) return;
          const arrived = rows.find(
            (a) =>
              a.source === source && a.connected && !connectedBefore.has(a.id),
          );
          // #region agent log
          const sourceRows = rows.filter((a) => a.source === source);
          fetch(
            "http://127.0.0.1:7359/ingest/cec9d836-64a0-42f6-913f-8582c9879b82",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "d09e18",
              },
              body: JSON.stringify({
                sessionId: "d09e18",
                hypothesisId: "H3",
                location: "library-sources-page/index.tsx:poll",
                message: arrived
                  ? "poll found new connected account"
                  : "poll no new connected account",
                data: {
                  source,
                  arrivedId: arrived?.id ?? null,
                  connectedBeforeSize: connectedBefore.size,
                  sourceAccounts: sourceRows.map((a) => ({
                    id: a.id,
                    connected: a.connected,
                    inBefore: connectedBefore.has(a.id),
                  })),
                },
                timestamp: Date.now(),
              }),
            },
          ).catch(() => {});
          // #endregion
          if (!arrived) return;
          arrivedOnce = true;
          syncMonitor.seed(arrived.id, source, { connected: true });
          void window.pond.syncRunNow(arrived.id);
          /** Let the wait card tick its remaining steps done before the detail card takes over. */
          connectFlow.complete();
          window.setTimeout(() => {
            /** Leaving connect-wait clears the flow via the dockMode subscription. */
            sourceDetail.openAccount(arrived.id);
          }, 1100);
        } catch {
          /* keep polling */
        }
      })();
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [waiting, connectedBefore, refetch]);

  /** A watch added from the tray card lands here: refresh the grid and open its detail. */
  useEffect(() => {
    if (!addedWatchId) return;
    void refetchWatches();
    sourceDetail.openWatch(addedWatchId);
    watchFlow.consumeAdded();
  }, [addedWatchId, refetchWatches]);

  /** Edits made inside the tray's detail card refresh this page's list copies. */
  useEffect(() => {
    if (detailRevision === 0) return;
    void refetch();
    void refetchWatches();
  }, [detailRevision, refetch, refetchWatches]);

  if (entries.length === 0) {
    return (
      <LibraryGrid.Root className={styles.root}>
        <p className={styles["quiet-line"]}>
          Connect a source or watch a public account. Pond keeps your library
          filling up in the background.
        </p>
      </LibraryGrid.Root>
    );
  }

  return (
    <LibraryGrid.Root className={styles.root}>
      <PackedGrid
        layout="grid"
        items={items}
        totalHeight={totalHeight}
        renderItem={(item) => {
          const entry = byId.get(item.id);
          if (!entry) return null;
          const status = byAccount[entry.row.id];
          const model = cardModel(status);
          if (entry.kind === "account") {
            const account = entry.row;
            return (
              <li key={item.id} className={styles.cell} style={cellStyle(item)}>
                <SourceTile
                  source={account.source}
                  avatarUrl={account.avatarUrl}
                  name={account.label ?? getSourceDef(account.source).label}
                  value={itemCount(account.sync?.knownCount ?? 0)}
                  tone={model.tone}
                  progress={syncFraction(model.tone, status)}
                  onOpen={() => sourceDetail.openAccount(account.id)}
                  menu={() => buildAccountTileMenu(account, model)}
                />
              </li>
            );
          }
          const watch = entry.row;
          return (
            <li key={item.id} className={styles.cell} style={cellStyle(item)}>
              <SourceTile
                source={watch.source}
                avatarUrl={watch.avatarUrl}
                name={watchName(watch)}
                value={itemCount(watch.sync?.knownCount ?? 0)}
                tone={model.tone}
                progress={syncFraction(model.tone, status)}
                onOpen={() => sourceDetail.openWatch(watch.id)}
                menu={() => buildWatchTileMenu(watch, model)}
              />
            </li>
          );
        }}
      />
    </LibraryGrid.Root>
  );
}

function SourceTile({
  source,
  avatarUrl,
  name,
  value,
  tone,
  progress = null,
  onOpen,
  menu,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  name: string;
  value: string;
  tone: ReturnType<typeof cardModel>["tone"];
  /** 0..1 while syncing with a known total; null when indeterminate or resting. */
  progress?: number | null;
  onOpen: () => void;
  menu?: () => MenuItemSpec[];
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pfp = avatarUrl && avatarUrl !== failedUrl ? avatarUrl : null;
  const { logo } = getSourceDef(source);

  const warn = tone === "err" || tone === "paused";

  /** Broken or in-flight artwork drains to grayscale; syncing pours color back in. */
  const drained = tone === "run" || warn;
  const artSrc = pfp ?? logo ?? undefined;
  const artVariant = pfp ? "account" : "source";

  const wipe =
    tone === "run" && artSrc ? (
      <img
        src={artSrc}
        alt=""
        className={styles.wipe}
        referrerPolicy="no-referrer"
        data-variant={artVariant}
        data-pulse={progress == null ? "" : undefined}
        style={
          progress != null
            ? ({ "--sources-wipe-p": progress } as React.CSSProperties)
            : undefined
        }
      />
    ) : null;

  const tile = (
    <button type="button" className={styles.tile} onClick={onOpen}>
      <span className={styles.cover}>
        {pfp ? (
          <React.Fragment>
            <img
              src={pfp}
              alt=""
              className={styles.image}
              referrerPolicy="no-referrer"
              onError={() => setFailedUrl(pfp)}
              data-variant="account"
              data-drained={drained || undefined}
            />
            {wipe}
            <img
              width={16}
              height={16}
              src={logo ?? undefined}
              alt=""
              className={styles.badge}
            />
          </React.Fragment>
        ) : (
          <React.Fragment>
            <img
              width={16}
              height={16}
              src={logo ?? undefined}
              alt=""
              className={styles.image}
              data-variant="source"
              data-drained={drained || undefined}
            />
            {wipe}
          </React.Fragment>
        )}
      </span>
      <span className={styles["tile-name"]}>{name}</span>
      <span
        className={styles["tile-sub"]}
        data-tone={warn ? "warn" : undefined}
      >
        {value}
      </span>
    </button>
  );

  if (!menu) return tile;
  return <SpecContextMenu buildItems={menu}>{tile}</SpecContextMenu>;
}
