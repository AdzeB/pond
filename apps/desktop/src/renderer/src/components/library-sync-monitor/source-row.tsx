import type { Source } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { drawerSpring } from "@/lib/motion";
import { relativeTime } from "@/lib/relative-time";
import { getSourceDef } from "@/lib/sources-registry";
import type { SyncSourceStatus, SyncState } from "@/stores/sync-monitor";
import { CompletionCheck } from "./completion-check";
import styles from "./styles.module.css";

const STATE_LABELS: Record<SyncState, string> = {
  idle: "Idle",
  running: "Syncing",
  done: "Up to date",
  error: "Failed",
  auth_required: "Sign in needed",
};

export function SourceRow({
  source,
  status,
}: {
  source: Source;
  status: SyncSourceStatus | undefined;
}) {
  const def = getSourceDef(source);
  const Icon = def.icon;
  const state = status?.state ?? "idle";
  const running = state === "running";
  const connected = status?.connected ?? false;
  const progress = status?.progress;
  const error = status?.lastError ?? null;
  const message = status?.message ?? null;
  const needsAuth = state === "auth_required";
  const failed = state === "error";
  const disconnected = !connected && !running && !needsAuth;

  // Brief "just finished" reward when a run completes successfully. Selective
  // emphasis: a calm idle row gets no badge, but the moment of completion does.
  const [justDone, setJustDone] = useState(false);
  const prevRunningRef = useRef(running);
  useEffect(() => {
    const wasRunning = prevRunningRef.current;
    prevRunningRef.current = running;
    if (wasRunning && !running && connected && !failed && !needsAuth) {
      setJustDone(true);
      const timer = setTimeout(() => setJustDone(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [running, connected, failed, needsAuth]);

  // Only show a badge when it adds signal; a calm idle row reads status from the meta line.
  const badge = running
    ? { text: STATE_LABELS.running, state: "running" as SyncState }
    : failed
      ? { text: STATE_LABELS.error, state: "error" as SyncState }
      : needsAuth
        ? {
            text: STATE_LABELS.auth_required,
            state: "auth_required" as SyncState,
          }
        : disconnected
          ? { text: "Not connected", state: "idle" as SyncState }
          : null;

  const meta =
    running && message
      ? message
      : failed && error
        ? error
        : needsAuth
          ? "Sign in to keep this source in sync"
          : disconnected
            ? "Connect this source to sync"
            : `Synced ${relativeTime(status?.lastSyncedAt ?? null)}`;

  return (
    <motion.div
      layout="position"
      transition={drawerSpring}
      className={styles.row}
      data-disconnected={disconnected || undefined}
    >
      <span className={styles.icon} aria-hidden>
        <Icon width={18} height={18} />
      </span>

      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.label}>{def.label}</span>
          {badge ? (
            <span
              className={styles.state}
              data-state={badge.state}
              aria-live="polite"
            >
              {badge.text}
            </span>
          ) : justDone ? (
            <span
              className={`${styles.state} ${styles.stateDone}`}
              data-state="done"
              aria-live="polite"
            >
              <CompletionCheck />
              Up to date
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
              aria-valuemax={progress?.total}
              aria-valuenow={progress?.current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
              {progress ? (
                <span className={styles.count}>
                  {progress.current}
                  {progress.total ? ` / ${progress.total}` : ""}
                </span>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <span
          className={styles.meta}
          title={failed && error ? error : undefined}
        >
          {meta}
        </span>
      </div>

      <div className={styles.rowActions}>
        {running ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void window.pond.syncCancel(source)}
          >
            Cancel
          </Button>
        ) : needsAuth ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void window.pond.connectSource(source)}
          >
            Sign in
          </Button>
        ) : disconnected ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void window.pond.connectSource(source)}
          >
            Connect
          </Button>
        ) : failed ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void window.pond.syncRunNow(source)}
          >
            Retry
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void window.pond.syncRunNow(source)}
          >
            Sync now
          </Button>
        )}
      </div>
    </motion.div>
  );
}
