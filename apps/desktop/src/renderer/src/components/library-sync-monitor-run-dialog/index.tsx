import { Button, Dialog } from "@pond/ui";
import {
  describeRun,
  formatClock,
  formatRunDuration,
  runLabel,
  runTone,
  type SyncRun,
  titleTrigger,
} from "@/components/library-sync-monitor/lib/helpers";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";
import styles from "./styles.module.css";

export function RunDialog({
  run,
  open,
  onOpenChange,
}: {
  run: SyncRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open && run ? <RunBody run={run} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RunBody({ run }: { run: SyncRun }) {
  const def = getSourceDef(run.source);
  const tone = runTone(run);
  const isError = tone === "err";
  const harvest = run.harvest;
  const enqueue = run.enqueue;

  return (
    <Dialog.Popup className={styles["dialog-popup"]}>
      <div className={styles["dialog-header"]}>
        <BrandTile source={run.source} size={44} />
        <div className={styles["dialog-heading"]}>
          <Dialog.Title className={styles["dialog-title"]}>
            {def.label}
            <span className={`${styles["run-outcome"]} ${styles[tone]}`}>
              <span className={styles["outcome-dot"]} />
              {runLabel(run)}
            </span>
          </Dialog.Title>
          <div className={styles["dialog-subtitle"]}>
            {titleTrigger(run.trigger)} · {formatClock(run.ts)} ·{" "}
            {formatRunDuration(run.durationMs)}
          </div>
        </div>
        <Dialog.Close
          render={<Button icon size="sm" variant="ghost" aria-label="Close" />}
        >
          ✕
        </Dialog.Close>
      </div>

      <div className={styles["dialog-body"]}>
        <div className={styles["dialog-section"]}>
          <div className={styles["section-title"]}>Pipeline</div>
          <div className={styles.flow}>
            <div className={styles["flow-step"]}>
              <div className={styles["step-name"]}>Harvest</div>
              <div className={styles["step-value"]}>
                {harvest?.seen ?? "—"} <span className={styles.dim}>seen</span>{" "}
                · {harvest?.fresh ?? "—"}{" "}
                <span className={styles.dim}>new</span>
              </div>
            </div>
            <div className={styles["flow-arrow"]}>→</div>
            <div className={styles["flow-step"]}>
              <div className={styles["step-name"]}>Enqueue</div>
              <div className={styles["step-value"]}>
                {enqueue?.succeeded ?? "—"}{" "}
                <span className={styles.dim}>queued</span> ·{" "}
                {enqueue?.failed ?? 0}{" "}
                <span className={styles.dim}>failed</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles["dialog-section"]}>
          <div className={styles["section-title"]}>Run</div>
          <div className={styles["key-value-row"]}>
            <span className={styles.key}>Outcome</span>
            <span
              className={`${styles.value} ${
                isError ? styles.err : tone === "ok" ? styles.ok : styles.muted
              }`}
            >
              {describeRun(run)}
            </span>
          </div>
          <div className={styles["key-value-row"]}>
            <span className={styles.key}>Trigger</span>
            <span className={styles.value}>{titleTrigger(run.trigger)}</span>
          </div>
          <div className={styles["key-value-row"]}>
            <span className={styles.key}>Duration</span>
            <span className={styles.value}>
              {formatRunDuration(run.durationMs)}
            </span>
          </div>
          <div className={styles["key-value-row"]}>
            <span className={styles.key}>Watchdog</span>
            <span className={`${styles.value} ${styles.muted}`}>
              {run.watchdogTripped ? "Reset stalled run" : "Not tripped"}
            </span>
          </div>
        </div>

        {isError && run.error ? (
          <div className={styles["dialog-section"]}>
            <div className={styles["section-title"]}>Error</div>
            <div className={styles["error-box"]}>
              <div className={styles["error-name"]}>
                {run.error.name || "Error"}
              </div>
              <div className={styles["error-message"]}>{run.error.message}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles["dialog-actions"]}>
        <Button
          variant="primary"
          onClick={() => void window.pond.syncRunNow(run.source)}
        >
          Re-run sync
        </Button>
      </div>
    </Dialog.Popup>
  );
}
