import { IconXmarkOutline18 as X } from "@pond/icons/outline/18";
import { SOURCES, type Source } from "@pond/schema/db";
import { Button, Dialog } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useIntervalWhen } from "rooks";
import { useMeasuredHeight } from "@/hooks/use-measured-height";
import { drawerSpring } from "@/lib/motion";
import { backfillMonitor } from "@/stores/backfill-monitor";
import {
  type SyncSourceStatus,
  syncMonitor,
  useSyncBySource,
  useSyncOpen,
} from "@/stores/sync-monitor";
import { BackfillRow } from "./backfill-row";
import { SourceRow } from "./source-row";
import styles from "./styles.module.css";

// Sources in a sync run; `local` holds only manual imports, so it's excluded.
const SYNCABLE: readonly Source[] = SOURCES.filter((s) => s !== "local");

const MORPH_SPRING = { type: "spring" as const, bounce: 0.18, duration: 0.45 };

// Lower sorts first: attention rows float up, disconnected sinks to the bottom group.
function priority(status: SyncSourceStatus | undefined): number {
  const state = status?.state ?? "idle";
  if (state === "error" || state === "auth_required") return 0;
  if (state === "running") return 1;
  if (status?.connected) return 2;
  return 3;
}

// Subscribes only to `open`; the data-heavy body mounts only while open, so background sync never re-renders here.
export function SyncMonitor() {
  const open = useSyncOpen();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) syncMonitor.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <SyncMonitorBody />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SyncMonitorBody() {
  const bySource = useSyncBySource();
  const popupRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [bodyRef, bodyHeight] = useMeasuredHeight<HTMLDivElement>();

  // Seed each source with a one-shot snapshot on open so the list isn't blank before the first live push.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await window.pond.screenshotBackfillStatus();
        if (!cancelled) backfillMonitor.ingest(status);
      } catch {
        /* snapshot is best-effort; live pushes still update the row */
      }
    })();
    for (const source of SYNCABLE) {
      void (async () => {
        try {
          const [status, conn] = await Promise.all([
            window.pond.syncStatus(source),
            window.pond.sourceStatus(source),
          ]);
          if (cancelled) return;
          syncMonitor.seed(source, {
            connected: conn.connected,
            lastSyncedAt: status.lastSyncedAt,
            lastError: status.lastError,
            state: status.running ? "running" : undefined,
          });
        } catch {
          /* snapshot is best-effort; live pushes still update the row */
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep relative timestamps ("3 days ago") honest while the dialog sits open.
  const [, setTick] = useState(0);
  useIntervalWhen(() => setTick((t) => t + 1), 30_000, true);

  const ordered = useMemo(
    () =>
      [...SYNCABLE].sort((a, b) => {
        const delta = priority(bySource[a]) - priority(bySource[b]);
        return delta !== 0 ? delta : SYNCABLE.indexOf(a) - SYNCABLE.indexOf(b);
      }),
    [bySource],
  );

  const runningSources = SYNCABLE.filter(
    (s) => bySource[s]?.state === "running",
  );
  const connectedCount = SYNCABLE.filter(
    (s) => bySource[s]?.connected || bySource[s]?.state === "running",
  ).length;
  const anyRunning = runningSources.length > 0;

  const summary = anyRunning
    ? `Syncing ${runningSources.length} of ${connectedCount}`
    : connectedCount
      ? `${connectedCount} connected`
      : "No sources connected";

  return (
    <Dialog.Popup
      ref={popupRef}
      tabIndex={-1}
      initialFocus={popupRef}
      className={`${styles.popup} ${styles.modal}`}
    >
      <div className={styles.header}>
        <div className={styles.heading}>
          <Dialog.Title className={styles.title}>Sync</Dialog.Title>
          <span className={styles.summary} aria-live="polite">
            {summary}
          </span>
        </div>
        <div className={styles.actions}>
          {anyRunning ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                for (const s of runningSources) void window.pond.syncCancel(s);
              }}
            >
              Cancel all
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={connectedCount === 0}
              onClick={() => void window.pond.syncRunAll()}
            >
              Sync all
            </Button>
          )}
          <Dialog.Close
            render={
              <Button icon size="sm" variant="ghost" aria-label="Close" />
            }
          >
            <X />
          </Dialog.Close>
        </div>
      </div>

      <motion.div
        className={styles.bodyMorph}
        initial={false}
        animate={{ height: bodyHeight }}
        transition={reduceMotion ? { duration: 0 } : MORPH_SPRING}
      >
        <div ref={bodyRef} className={styles.body}>
          {ordered.map((source, i) => {
            const isDisconnected = priority(bySource[source]) === 3;
            const prev = i > 0 ? ordered[i - 1] : undefined;
            const startsGroup =
              isDisconnected && (!prev || priority(bySource[prev]) !== 3);
            return (
              <Fragment key={source}>
                <AnimatePresence initial={false}>
                  {startsGroup ? (
                    <motion.div
                      key="group-label"
                      layout="position"
                      className={styles.groupLabel}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={drawerSpring}
                    >
                      Not connected
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <SourceRow source={source} status={bySource[source]} />
              </Fragment>
            );
          })}
          <div className={styles.groupLabel}>Maintenance</div>
          <BackfillRow />
        </div>
      </motion.div>
    </Dialog.Popup>
  );
}
