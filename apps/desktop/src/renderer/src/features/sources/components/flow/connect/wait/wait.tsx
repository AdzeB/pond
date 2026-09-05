import { IconCircleCheckFill18 as Connected } from "@pond/icons/fill/18";
import { Button, PageDialog } from "@pond/ui";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  useConnectCompleted,
  useConnectSource,
} from "@/features/sources/state/connect-flow";
import { sourceFlow } from "@/features/sources/state/source-flow";
import styles from "./wait.module.css";

export function ConnectWaitSection() {
  const source = useConnectSource();
  const completed = useConnectCompleted();

  if (!source) return null;

  const label = getSourceDef(source).label;

  return (
    <>
      <div className={styles.body} data-state={completed ? "done" : "waiting"}>
        {completed ? <Connected className={styles.mark} /> : null}
        <div className={styles.copy}>
          <p className={styles.status}>
            {completed ? "Connected" : `Waiting for ${label} sign-in`}
          </p>
          {completed ? null : (
            <p className={styles.hint}>
              Sign in in your browser. The Pond extension sends the session
              back.
            </p>
          )}
        </div>
      </div>
      <PageDialog.Footer>
        <PageDialog.Cancel
          disabled={completed}
          onClick={() => sourceFlow.close()}
        />
        {completed ? (
          <PageDialog.Confirm disabled>Connected</PageDialog.Confirm>
        ) : (
          <Button
            variant="tertiary"
            size="md"
            width="full"
            onClick={() => void window.pond.connectSource(source)}
          >
            Open Again
          </Button>
        )}
      </PageDialog.Footer>
    </>
  );
}
