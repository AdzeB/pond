import { IconImageFill18 as ScreenshotIcon } from "@pond/icons/fill/18";
import { Button } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { drawerSpring } from "@/lib/motion";
import {
  type BackfillState,
  useBackfillStatus,
} from "@/stores/backfill-monitor";
import { CompletionCheck } from "./completion-check";
import styles from "./styles.module.css";

const BADGE_LABELS: Partial<Record<BackfillState, string>> = {
  running: "Recapturing",
  error: "Failed",
  done: "Done",
};

export function BackfillRow() {
  const status = useBackfillStatus();
  const running = status.state === "running";
  const failed = status.state === "error";
  const done = status.state === "done";
  const badgeText = BADGE_LABELS[status.state];

  const meta =
    status.message ??
    (failed
      ? "Couldn't recapture screenshots"
      : "Recapture missing or outdated tweet screenshots");

  const pct =
    status.total > 0
      ? Math.min(100, Math.round((status.attempted / status.total) * 100))
      : 0;

  return (
    <motion.div
      layout="position"
      transition={drawerSpring}
      className={styles.row}
    >
      <span className={styles.icon} aria-hidden>
        <ScreenshotIcon width={18} height={18} />
      </span>

      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.label}>Tweet screenshots</span>
          {badgeText ? (
            <span
              className={`${styles.state} ${done ? styles.stateDone : ""}`}
              data-state={failed ? "error" : status.state}
              aria-live="polite"
            >
              {done ? <CompletionCheck /> : null}
              {badgeText}
            </span>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {running ? (
            <motion.div
              key="progress"
              className={styles.progress}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={status.total || undefined}
              aria-valuenow={status.attempted}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={drawerSpring}
            >
              <div className={styles.track}>
                {status.total > 0 ? (
                  <div className={styles.fill} style={{ width: `${pct}%` }} />
                ) : (
                  <div className={`${styles.fill} ${styles.indeterminate}`} />
                )}
              </div>
              {status.total > 0 ? (
                <span className={styles.count}>
                  {status.attempted} / {status.total}
                </span>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <span className={styles.meta} title={failed ? meta : undefined}>
          {meta}
        </span>
      </div>

      <div className={styles.rowActions}>
        {running ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void window.pond.screenshotBackfillCancel()}
          >
            Cancel
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void window.pond.screenshotBackfillRun()}
          >
            {failed ? "Retry" : "Backfill"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
