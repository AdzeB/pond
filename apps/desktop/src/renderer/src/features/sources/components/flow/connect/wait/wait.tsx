import { IconCheck2Fill12 } from "@pond/icons/fill/12";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button } from "@pond/ui";
import { useEffect } from "react";
import { BrandTile } from "@/features/sources/components/sync-monitor-source-tile/sync-monitor-source-tile";
import {
  type AccountRow,
  useAccounts,
} from "@/features/sources/hooks/use-accounts";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  connectFlow,
  useConnectCompleted,
  useConnectedBefore,
  useConnectFailed,
  useConnectSource,
  useConnectWaiting,
} from "@/features/sources/state/connect-flow";
import { sourceDetail } from "@/features/sources/state/source-detail";
import { syncMonitor } from "@/features/sources/state/sync-monitor";
import { findArrivedAccount } from "./arrival";
import styles from "./wait.module.css";

export function ConnectWaitSection() {
  const source = useConnectSource();
  const completed = useConnectCompleted();
  const failed = useConnectFailed();
  useConnectArrival();
  if (!source) return null;
  const label = getSourceDef(source).label;

  return (
    <>
      <div className={styles.body}>
        <div className={styles.avatar}>
          <div className={styles.image}>
            <BrandTile source={source} size={96} />
            <span
              className={styles.badge}
              data-state={
                completed ? "connected" : failed ? "failed" : "waiting"
              }
              aria-hidden="true"
            >
              <span className={styles.loading}>
                <span className={styles.spinner} />
              </span>
              <IconCheck2Fill12 className={styles.check} />
              <IconXmarkOutline12 className={styles.cross} strokeWidth={2} />
            </span>
          </div>
        </div>
        <div className={styles.copy} aria-live="polite">
          <p className={styles.status}>
            {completed
              ? "Connected"
              : failed
                ? "Connection Unavailable"
                : "Requesting Connection"}
          </p>
          <p className={styles.hint}>
            {completed
              ? `${label} is connected. Your saved posts will appear in your library.`
              : failed
                ? `Couldn't open ${label}. Try opening the sign-in page again.`
                : `Sign in to ${label} in your browser. The Pond extension sends your session back.`}
          </p>
        </div>
      </div>
      {failed && !completed ? (
        <Button
          variant="tertiary"
          width="full"
          className={styles.retry}
          onClick={() => connectFlow.retry()}
        >
          Try Again
        </Button>
      ) : null}
    </>
  );
}

function useConnectArrival(): void {
  const waiting = useConnectWaiting();
  const connectedBefore = useConnectedBefore();
  const { refetch } = useAccounts();

  useEffect(() => {
    if (!waiting) return;
    const source = waiting;
    let cancelled = false;
    let arrivedOnce = false;
    let inflight = false;
    let pending = false;
    let importedAccountId: string | null = null;

    const finish = (account: AccountRow) => {
      if (cancelled || arrivedOnce) return;
      arrivedOnce = true;
      syncMonitor.seed(account.id, source, { connected: true });
      void window.pond.syncRunNow(account.id);
      connectFlow.complete();
      window.setTimeout(() => {
        if (cancelled) return;
        connectFlow.clear();
        sourceDetail.openAccount(account.id);
      }, 1100);
    };

    const tick = () => {
      if (cancelled || arrivedOnce) return;
      if (inflight) {
        pending = true;
        return;
      }
      inflight = true;
      void (async () => {
        try {
          const list = await refetch();
          if (cancelled || arrivedOnce) return;
          const arrived = findArrivedAccount(
            list,
            source,
            connectedBefore,
            importedAccountId,
          );
          if (!arrived) return;
          finish(arrived);
        } catch {
        } finally {
          inflight = false;
          if (pending) {
            pending = false;
            tick();
          }
        }
      })();
    };

    const stopListen = window.pond.onSessionImported((payload) => {
      if (payload.source !== source) return;
      importedAccountId = payload.accountId;
      tick();
    });

    tick();
    const timer = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
      stopListen();
    };
  }, [waiting, connectedBefore, refetch]);
}
