import { IconCircleCheckFill18 as Connected } from "@pond/icons/fill/18";
import { Button, TrayCard } from "@pond/ui";
import { useDock } from "@/components/library/dock/lib/context";
import { getSourceDef } from "@/lib/save/sources-registry";
import { useConnectCompleted, useConnectSource } from "@/stores/connect-flow";
import styles from "./styles.module.css";

/** Holds while the browser sign-in finishes; the sources page polls and advances once the account arrives. */
export function ConnectWaitSection() {
  const dock = useDock();
  const source = useConnectSource();
  const completed = useConnectCompleted();

  if (!source) return null;

  const label = getSourceDef(source).label;

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back onClick={() => dock.openViewMenu("connect-source")} />
        <TrayCard.Title position="center">Connect {label}</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.body} data-state={completed ? "done" : "waiting"}>
        {completed ? (
          <Connected className={styles.mark} />
        ) : (
          <span className={styles.spinner} aria-hidden />
        )}
        <div className={styles.copy}>
          <p className={styles.status}>
            {completed ? "Connected" : `Waiting for ${label} sign-in`}
          </p>
          {completed ? null : (
            <p className={styles.hint}>
              We opened {label} in your browser. Sign in there and Pond will
              finish automatically.
            </p>
          )}
        </div>
      </div>
      <TrayCard.Footer>
        <TrayCard.Cancel disabled={completed} />
        {completed ? (
          <TrayCard.Confirm disabled>Connected</TrayCard.Confirm>
        ) : (
          <Button
            variant="tertiary"
            size="lg"
            style={{ width: "100%" }}
            onClick={() => void window.pond.connectSource(source)}
          >
            Reopen {label}
          </Button>
        )}
      </TrayCard.Footer>
    </>
  );
}
