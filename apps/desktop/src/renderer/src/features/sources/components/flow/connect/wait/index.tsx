import { IconCircleCheckFill12 } from "@pond/icons/fill/12";
import { Button, Dialog } from "@pond/ui";
import { useEffect } from "react";
import { ConnectionVisual } from "@/features/sources/components/flow/connection-visual";
import {
  type AccountRow,
  useAccounts,
} from "@/features/sources/hooks/use-accounts";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  connectFlow,
  useConnectCompleted,
  useConnectedAccount,
  useConnectedBefore,
  useConnectFailed,
  useConnectSource,
  useConnectWaiting,
} from "@/features/sources/state/connect-flow";
import { sourceDetail } from "@/features/sources/state/source-detail";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { syncMonitor } from "@/features/sources/state/sync-monitor";
import { findArrivedAccount } from "./arrival";
import styles from "./styles.module.css";

export function ConnectWaitSection() {
  const source = useConnectSource();
  const completed = useConnectCompleted();
  const failed = useConnectFailed();
  useConnectArrival();
  if (!source) return null;
  const label = getSourceDef(source).label;
  const state = completed ? "connected" : failed ? "failed" : "waiting";

  return (
    <div className={styles.body}>
      <ConnectionVisual source={source} state={state} />
      <div
        key={state}
        className={styles.copy}
        data-state={completed ? "connected" : failed ? "failed" : undefined}
        aria-live="polite"
      >
        <h2 className={styles.title}>
          {completed
            ? `${label} is connected`
            : failed
              ? `Couldn't connect ${label}`
              : `Connect ${label} to Pond`}
        </h2>
        <p className={styles.description}>
          {completed ? (
            <>
              Pond is syncing your saved posts now.
              <br />
              New saves keep arriving in your library.
            </>
          ) : failed ? (
            "Try opening the sign-in page again."
          ) : (
            <>
              Sign in to {label} in your browser.
              <br />
              Pond will finish the connection here.
            </>
          )}
        </p>
      </div>
      <ConnectPromises />
    </div>
  );
}

function ConnectPromises() {
  return (
    <>
      <div className={styles.details}>
        <p className={styles["details-title"]}>Pond will</p>
        <ul className={styles.checklist}>
          <li>
            <IconCircleCheckFill12 className={styles.check} />
            <span>Keep your session on this device</span>
          </li>
          <li>
            <IconCircleCheckFill12 className={styles.check} />
            <span>Read your saved posts</span>
          </li>
          <li>
            <IconCircleCheckFill12 className={styles.check} />
            <span>Add new saves to your library</span>
          </li>
        </ul>
      </div>
      <p className={styles.note}>
        Sign in through your browser. The session stays on this device, and Pond
        only reads your saves.
      </p>
    </>
  );
}

export function ConnectActions() {
  const completed = useConnectCompleted();
  const failed = useConnectFailed();
  const account = useConnectedAccount();
  if (completed && account)
    return (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            connectFlow.clear();
            sourceFlow.close();
            sourceDetail.openAccount(account.id);
          }}
        >
          View
        </Button>
        <Dialog.Confirm
          onClick={() => {
            connectFlow.clear();
            sourceFlow.close();
          }}
        >
          Done
        </Dialog.Confirm>
      </>
    );
  return (
    <>
      <Dialog.Cancel />
      {failed ? (
        <Dialog.Confirm onClick={() => connectFlow.retry()}>
          Try Again
        </Dialog.Confirm>
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
      connectFlow.complete(account);
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
