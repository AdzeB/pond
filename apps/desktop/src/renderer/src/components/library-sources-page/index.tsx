import { IconDotsFill18 as Dots } from "@pond/icons/fill/18";
import type { Source } from "@pond/schema/db";
import { Button, Menu } from "@pond/ui";
import { useEffect, useState } from "react";
import { cardModel } from "@/components/library-sync-monitor/lib/helpers";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { useAccounts } from "@/hooks/use-accounts";
import { useWatches } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import {
  connectFlow,
  useConnectedBefore,
  useConnectWaiting,
} from "@/stores/connect-flow";
import { dockMode } from "@/stores/dock-mode";
import { sourceDetail, useSourceDetailRevision } from "@/stores/source-detail";
import { syncMonitor, useSyncByAccount } from "@/stores/sync-monitor";
import { useWatchAdded, watchFlow } from "@/stores/watch-flow";
import {
  accountName,
  accountSub,
  healthLine,
  watchName,
  watchSub,
} from "./lib/helpers";
import styles from "./styles.module.css";

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
    const timer = setInterval(() => {
      void (async () => {
        try {
          const rows = await refetch();
          if (cancelled) return;
          const arrived = rows.find(
            (a) =>
              a.source === source && a.connected && !connectedBefore.has(a.id),
          );
          if (!arrived) return;
          syncMonitor.seed(arrived.id, source, { connected: true });
          void window.pond.syncRunNow(arrived.id);
          connectFlow.clear();
          sourceDetail.openAccount(arrived.id);
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
        <header className={styles.header}>
          <h1 className={styles.title}>Sources</h1>
          <p className={styles.subline}>
            {healthLine(accounts, watches, byAccount)}
          </p>
          <span className={styles["header-actions"]}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dockMode.open("source-new")}
            >
              New
            </Button>
            <Menu.Root>
              <Menu.Trigger icon variant="secondary" size="sm">
                <Dots />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="bottom" align="end">
                  <Menu.Popup>
                    <Menu.Item onClick={() => void window.pond.syncRunAll()}>
                      Sync All
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </span>
        </header>

        {broken && brokenModel ? (
          <div className={styles.banner}>
            <span className={styles["banner-title"]}>
              {accountName(broken)} needs attention
            </span>
            <span className={styles["banner-sub"]}>
              {brokenModel.tone === "paused"
                ? "Session expired — sign back into that account to resume syncing."
                : "Last sync failed — retry, or open the account for details."}
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
              const model = cardModel(byAccount[account.id]);
              return (
                <SourceTile
                  key={account.id}
                  source={account.source}
                  avatarUrl={account.avatarUrl}
                  name={account.label ?? getSourceDef(account.source).label}
                  sub={accountSub(account, model)}
                  tone={model.tone}
                  onOpen={() => sourceDetail.openAccount(account.id)}
                />
              );
            })}
            {watches.map((watch) => {
              const model = cardModel(byAccount[watch.id]);
              return (
                <SourceTile
                  key={watch.id}
                  source={watch.source}
                  avatarUrl={watch.avatarUrl}
                  name={watchName(watch)}
                  sub={watchSub(watch, model)}
                  tone={model.tone}
                  onOpen={() => sourceDetail.openWatch(watch.id)}
                />
              );
            })}
          </div>
        ) : (
          <p className={styles["quiet-line"]}>
            Connect a source or watch a public account — Pond keeps your library
            filling up in the background.
          </p>
        )}
      </div>
    </div>
  );
}

/** Accounts and watches render identically; only the derived name and sub differ. */
function SourceTile({
  source,
  avatarUrl,
  name,
  sub,
  tone,
  onOpen,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  name: string;
  sub: string;
  tone: ReturnType<typeof cardModel>["tone"];
  onOpen: () => void;
}) {
  /** Avatar CDN URLs are signed and expire; a failed one falls back to the brand mark and retries automatically when a fresh URL arrives. */
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pfp = avatarUrl && avatarUrl !== failedUrl ? avatarUrl : null;

  return (
    <button type="button" className={styles["watch-tile"]} onClick={onOpen}>
      <span
        className={styles["watch-face"]}
        data-running={tone === "run" || undefined}
      >
        {pfp ? (
          <>
            <img
              className={styles["watch-pfp"]}
              src={pfp}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setFailedUrl(pfp)}
            />
            <span className={styles["watch-badge"]}>
              <BrandTile source={source} size={16} />
            </span>
          </>
        ) : (
          <BrandTile source={source} size={52} />
        )}
      </span>
      <span className={styles["watch-name"]}>{name}</span>
      <span
        className={styles["watch-sub"]}
        data-tone={tone === "err" || tone === "paused" ? "warn" : undefined}
      >
        {sub}
      </span>
    </button>
  );
}
