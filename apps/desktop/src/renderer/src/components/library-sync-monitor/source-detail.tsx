import type { Source } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { useSourceSaveCount } from "@/hooks/use-saves";
import { formatNumber } from "@/lib/format";
import { directionalVariants, drawerSpring } from "@/lib/motion";
import { relativeTime } from "@/lib/relative-time";
import { useBackfillStatus } from "@/stores/backfill-monitor";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import { BrandTile } from "./source-tile";
import styles from "./styles.module.css";

export function SourceDetail({
  focused,
  status,
  direction,
}: {
  focused: Source;
  status: SyncSourceStatus | undefined;
  direction: "forward" | "backward";
}) {
  const state = status?.state ?? "idle";
  const running = state === "running";
  const failed = state === "error";
  const needsAuth = state === "auth_required";
  const connected = status?.connected ?? false;
  const progress = status?.progress;
  const saves = useSourceSaveCount(focused);

  const stats: { value: string; label: string }[] = [
    { value: relativeTime(status?.lastSyncedAt ?? null), label: "Last sync" },
    { value: formatNumber(saves), label: "Saves" },
  ];

  return (
    <motion.div
      key="detail"
      className={`${styles.view} ${styles.detailView}`}
      custom={direction}
      variants={directionalVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={drawerSpring}
    >
      <motion.span
        key={focused}
        className={styles.hero}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={drawerSpring}
      >
        <BrandTile source={focused} />
      </motion.span>

      <AnimatePresence initial={false}>
        {running ? (
          <motion.div
            key="progress"
            className={styles.progress}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress?.total}
            aria-valuenow={progress?.current}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={drawerSpring}
          >
            <div className={styles.track}>
              {progress?.total ? (
                <div
                  className={styles.fill}
                  style={{
                    width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`,
                  }}
                />
              ) : (
                <div className={`${styles.fill} ${styles.indeterminate}`} />
              )}
            </div>
            <span className={styles.count}>
              {status?.message ??
                (progress
                  ? `${progress.current}${progress.total ? ` / ${progress.total}` : ""}`
                  : "Syncing…")}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {connected && !failed ? (
        <div className={styles.stats}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      ) : failed && status?.lastError ? (
        <p className={styles.errorText}>{status.lastError}</p>
      ) : !connected && !needsAuth ? (
        <p className={styles.hint}>Connect this source to start syncing.</p>
      ) : needsAuth ? (
        <p className={styles.hint}>
          Sign in again to keep this source in sync.
        </p>
      ) : null}

      <DetailActions
        focused={focused}
        running={running}
        failed={failed}
        needsAuth={needsAuth}
        connected={connected}
      />

      {focused === "twitter" && connected ? <TweetMaintenance /> : null}
    </motion.div>
  );
}

function DetailActions({
  focused,
  running,
  failed,
  needsAuth,
  connected,
}: {
  focused: Source;
  running: boolean;
  failed: boolean;
  needsAuth: boolean;
  connected: boolean;
}) {
  if (running) {
    return (
      <Button
        className={styles.action}
        size="lg"
        variant="secondary"
        onClick={() => void window.pond.syncCancel(focused)}
      >
        Cancel sync
      </Button>
    );
  }
  if (!connected || needsAuth) {
    return (
      <Button
        className={styles.action}
        size="lg"
        variant="accent"
        onClick={() => void window.pond.connectSource(focused)}
      >
        {needsAuth ? "Sign in" : "Setup connection"}
      </Button>
    );
  }
  return (
    <Button
      className={styles.action}
      size="lg"
      variant="accent"
      onClick={() => void window.pond.syncRunNow(focused)}
    >
      {failed ? "Retry sync" : "Start sync"}
    </Button>
  );
}

// Tweet-screenshot backfill is twitter-specific maintenance; surfaced here so
// the redesigned monitor doesn't drop the only entry point to it.
function TweetMaintenance() {
  const status = useBackfillStatus();
  const running = status.state === "running";
  return (
    <button
      type="button"
      className={styles.maintenance}
      onClick={() =>
        running
          ? void window.pond.screenshotBackfillCancel()
          : void window.pond.screenshotBackfillRun()
      }
    >
      {running
        ? `Updating tweet screenshots… ${status.total ? `${status.attempted}/${status.total}` : ""} · Cancel`
        : status.state === "error"
          ? "Retry tweet screenshots"
          : "Update tweet screenshots"}
    </button>
  );
}
