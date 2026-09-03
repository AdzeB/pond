import { Button } from "@pond/ui/button";
import { PopupShell } from "../shell";
import styles from "./styles.module.css";

export function OfflineView({
  onRetry,
}: {
  onRetry: () => void | Promise<void>;
}) {
  return (
    <PopupShell>
      <div className={styles.heading}>
        <h1 className={styles.title}>Not running</h1>
        <p className={styles.subtitle}>
          Pond isn't running on this Mac. Open the app.
        </p>
      </div>

      <Button
        variant="primary"
        size="lg"
        width="full"
        onClick={() => void onRetry()}
      >
        Try Again
      </Button>
    </PopupShell>
  );
}
