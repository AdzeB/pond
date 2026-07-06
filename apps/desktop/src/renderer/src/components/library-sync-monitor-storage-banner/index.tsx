import { IconTriangleWarningFill18 as Warning } from "@pond/icons/fill/18";
import { Button } from "@pond/ui";
import { useState } from "react";
import { formatBytes } from "@/lib/util/format";
import { useStorageStatus } from "@/stores/storage-status";
import styles from "./styles.module.css";

export function StorageBanner() {
  const storage = useStorageStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!storage || storage.state === "ok" || dismissed) return null;

  const exceeded = storage.state === "exceeded";
  const cap = storage.capBytes ? formatBytes(storage.capBytes) : "the cap";
  const paused = exceeded && storage.action === "pauseSync";

  return (
    <div className={styles.banner}>
      <span className={styles["banner-icon"]} aria-hidden>
        <Warning width={16} height={16} />
      </span>
      <span className={styles["banner-text"]}>
        <b>
          {paused
            ? "Syncs paused — storage cap reached."
            : exceeded
              ? "Storage cap reached."
              : "Storage is almost full."}
        </b>{" "}
        <span className={styles.dim}>
          Pond is using {formatBytes(storage.pondBytes)} of {cap}. Free space or
          raise the cap{paused ? " to resume" : ""}.
        </span>
      </span>
      <span className={styles["banner-actions"]}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </Button>
      </span>
    </div>
  );
}
