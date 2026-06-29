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
    <div className={styles.sbanner}>
      <span className={styles.bIco}>!</span>
      <span className={styles.bText}>
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
      <span className={styles.bAct}>
        <button
          type="button"
          className={styles.customize}
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </span>
    </div>
  );
}
