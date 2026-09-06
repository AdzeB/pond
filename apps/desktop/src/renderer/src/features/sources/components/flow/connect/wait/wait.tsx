import { IconCheck2Fill12 } from "@pond/icons/fill/12";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button } from "@pond/ui";
import { BrandTile } from "@/features/sources/components/sync-monitor-source-tile/sync-monitor-source-tile";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  connectFlow,
  useConnectCompleted,
  useConnectFailed,
  useConnectSource,
} from "@/features/sources/state/connect-flow";
import styles from "./wait.module.css";

export function ConnectWaitSection() {
  const source = useConnectSource();
  const completed = useConnectCompleted();
  const failed = useConnectFailed();
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
