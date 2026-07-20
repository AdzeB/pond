import { IconCircleCheckFill18 as StepDone } from "@pond/icons/fill/18";
import { IconArrowUpRightOutline18 as ArrowUpRight } from "@pond/icons/outline/18";
import { TrayCard } from "@pond/ui";
import { Calligraph } from "calligraph";
import { useEffect, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { getSourceDef } from "@/lib/save/sources-registry";
import { useConnectCompleted, useConnectWaiting } from "@/stores/connect-flow";
import styles from "./wait.module.css";

type StepState = "done" | "active" | "todo";

function StepMark({ state }: { state: StepState }) {
  if (state === "done") {
    return <StepDone className={styles.check} width={16} height={16} />;
  }
  if (state === "active") return <span className={styles.spinner} />;
  return <span className={styles.dot} />;
}

/** Sign-in wait card; the sources page polls for the account and closes the tray when it arrives. */
export function ConnectWaitSection() {
  const dock = useDock();
  const waiting = useConnectWaiting();
  const completed = useConnectCompleted();
  /** The store clears before the card swaps out; any brand keeps the exit render intact. */
  const source = waiting ?? "twitter";
  const label = getSourceDef(source).label;

  /** Sign-in itself isn't observable, so the middle steps only tick once the account actually arrives, staggered so completion reads as progress rather than a flash. */
  const [pushDone, setPushDone] = useState(false);
  useEffect(() => {
    if (!completed) {
      setPushDone(false);
      return;
    }
    const timer = window.setTimeout(() => setPushDone(true), 300);
    return () => window.clearTimeout(timer);
  }, [completed]);

  const signInState: StepState = completed ? "done" : "active";
  const pushState: StepState = pushDone
    ? "done"
    : completed
      ? "active"
      : "todo";

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back onClick={() => dock.openViewMenu("connect-source")} />
        <TrayCard.Title position="center">Connect {label}</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
      </TrayCard.Header>
      <ol className={styles.steps}>
        <li className={styles.step} data-state="done">
          <StepMark state="done" />
          Opened {label} in your browser
        </li>
        <li className={styles.step} data-state={signInState}>
          <StepMark state={signInState} />
          Sign in as you normally would
        </li>
        <li className={styles.step} data-state={pushState}>
          <StepMark state={pushState} />
          Push the session with the Pond extension
        </li>
      </ol>
      <TrayCard.Footer>
        <TrayCard.Cancel disabled={completed} />
        <TrayCard.Confirm
          disabled={completed}
          onClick={(e) => {
            /** Reopening the browser keeps the wait alive; only the arriving account closes this card. */
            e.preventDefault();
            if (!completed) void window.pond.connectSource(source);
          }}
        >
          {completed ? null : <ArrowUpRight width={14} height={14} />}
          <Calligraph>
            {completed ? "Connected" : "Reopen in Browser"}
          </Calligraph>
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
