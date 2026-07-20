import type { Source } from "@pond/schema/db";
import { Button, type MenuItemSpec } from "@pond/ui";
import React, { useEffect, useState } from "react";
import {
  type CardModel,
  cardModel,
} from "@/components/library-sync-monitor/lib/helpers";
import { SpecContextMenu } from "@/components/spec-context-menu";
import { type AccountRow, useAccounts } from "@/hooks/use-accounts";
import { useWatches, type WatchRow } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { getAppRouter } from "@/lib/ui/app-router";
import {
  connectFlow,
  useConnectedBefore,
  useConnectWaiting,
} from "@/stores/connect-flow";
import { sourceDetail, useSourceDetailRevision } from "@/stores/source-detail";
import { syncMonitor, useSyncByAccount } from "@/stores/sync-monitor";
import { setSearchInput } from "@/stores/view-store";
import { useWatchAdded, watchFlow } from "@/stores/watch-flow";
import { buildAccountMenu } from "./lib/account-menu";
import {
  accountName,
  accountSub,
  itemCount,
  syncFraction,
  watchName,
  watchSub,
} from "./lib/helpers";
import styles from "./styles.module.css";

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

export function SourcesPage() {
  const { accounts, refetch } = useAccounts();
  const { watches, refetch: refetchWatches } = useWatches();
  const byAccount = useSyncByAccount();
  /** Connect and watch flows live in the dock tray; this page polls for the outcome and opens the detail card. */
  const waiting = useConnectWaiting();
  const connectedBefore = useConnectedBefore();
  const addedWatchId = useWatchAdded();
  const detailRevision = useSourceDetailRevision();

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
          if (!arrived) return;
          arrivedOnce = true;
          syncMonitor.seed(arrived.id, source, { connected: true });
          void window.pond.syncRunNow(arrived.id);
          /** Let the wait card tick its remaining steps done before the detail card takes over. */
          connectFlow.complete();
          window.setTimeout(() => {
            connectFlow.clear();
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

  /** First account that needs a human: session expired or repeated failure. */
  const broken = accounts.find((a) => {
    const tone = cardModel(byAccount[a.id]).tone;
    return tone === "err" || tone === "paused";
  });
  const brokenModel = broken ? cardModel(byAccount[broken.id]) : null;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {broken && brokenModel ? (
          <div className={styles.banner}>
            <span className={styles["banner-title"]}>
              {accountName(broken)} needs attention
            </span>
            <span className={styles["banner-sub"]}>
              {brokenModel.tone === "paused"
                ? "Session expired. Sign back into that account to resume syncing."
                : "Last sync failed. Retry, or open the account for details."}
            </span>
            <Button
              className={styles["banner-action"]}
              variant="secondary"
              size="sm"
              onClick={() => {
                if (brokenModel.tone === "paused") {
                  void window.pond.connectSource(broken.source);
                } else {
                  void window.pond.syncRunNow(broken.id);
                }
              }}
            >
              {brokenModel.tone === "paused" ? "Reconnect" : "Retry"}
            </Button>
          </div>
        ) : null}

        {accounts.length > 0 || watches.length > 0 ? (
          <div className={styles["tile-grid"]}>
            {accounts.map((account) => {
              const status = byAccount[account.id];
              const model = cardModel(status);
              return (
                <SourceTile
                  key={account.id}
                  source={account.source}
                  avatarUrl={account.avatarUrl}
                  name={account.label ?? getSourceDef(account.source).label}
                  sub={accountSub(account, model)}
                  value={itemCount(account.sync?.knownCount ?? 0)}
                  tone={model.tone}
                  progress={syncFraction(model.tone, status)}
                  onOpen={() => sourceDetail.openAccount(account.id)}
                  menu={() => buildAccountTileMenu(account, model)}
                />
              );
            })}
            {watches.map((watch) => {
              const status = byAccount[watch.id];
              const model = cardModel(status);
              return (
                <SourceTile
                  key={watch.id}
                  source={watch.source}
                  avatarUrl={watch.avatarUrl}
                  name={watchName(watch)}
                  sub={watchSub(watch, model)}
                  value={itemCount(watch.sync?.knownCount ?? 0)}
                  tone={model.tone}
                  progress={syncFraction(model.tone, status)}
                  onOpen={() => sourceDetail.openWatch(watch.id)}
                  menu={() => buildWatchTileMenu(watch, model)}
                />
              );
            })}
          </div>
        ) : (
          <p className={styles["quiet-line"]}>
            Connect a source or watch a public account. Pond keeps your library
            filling up in the background.
          </p>
        )}
      </div>
    </div>
  );
}

/** Exported for the source tile playground; the page is its only production caller. */
export function SourceTile({
  source,
  avatarUrl,
  name,
  sub,
  value,
  tone,
  progress = null,
  onOpen,
  menu,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  name: string;
  sub: string;
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

  /** The count is the resting line; status only takes it over while something is happening or wrong. */
  const warn = tone === "err" || tone === "paused";
  const line = tone === "run" || warn ? sub : value;

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
        {line}
      </span>
    </button>
  );

  if (!menu) return tile;
  return <SpecContextMenu buildItems={menu}>{tile}</SpecContextMenu>;
}
