import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { SOURCES, type Source } from "@pond/schema/db";
import { Button, Dialog } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useIntervalWhen } from "rooks";
import { useMeasuredHeight } from "@/hooks/use-measured-height";
import { getSourceDef } from "@/lib/sources-registry";
import { backfillMonitor } from "@/stores/backfill-monitor";
import {
  syncMonitor,
  useSyncBySource,
  useSyncOpen,
} from "@/stores/sync-monitor";
import { Overview } from "./overview";
import { SourceDetail } from "./source-detail";
import styles from "./styles.module.css";

// Sources you can sync; `local` holds only manual imports, so it's excluded.
const SYNCABLE: readonly Source[] = SOURCES.filter((s) => s !== "local");

const MORPH_SPRING = { type: "spring" as const, bounce: 0.18, duration: 0.45 };

type Direction = "forward" | "backward";

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

  const [mode, setMode] = useState<"overview" | "detail">("overview");
  const [focused, setFocused] = useState<Source>(SYNCABLE[0] ?? "twitter");
  const [direction, setDirection] = useState<Direction>("forward");

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

  const runningSources = SYNCABLE.filter(
    (s) => bySource[s]?.state === "running",
  );
  const connectedCount = SYNCABLE.filter(
    (s) => bySource[s]?.connected || bySource[s]?.state === "running",
  ).length;
  const anyRunning = runningSources.length > 0;

  const summary = anyRunning
    ? `Syncing ${runningSources.length} of ${connectedCount} connected`
    : connectedCount
      ? `${connectedCount} of ${SYNCABLE.length} sources connected`
      : "No sources connected yet";

  const openDetail = (source: Source) => {
    setFocused(source);
    setDirection("forward");
    setMode("detail");
  };

  const back = () => {
    setDirection("backward");
    setMode("overview");
  };

  const title =
    mode === "overview" ? "Confluences" : getSourceDef(focused).label;

  return (
    <Dialog.Popup
      ref={popupRef}
      tabIndex={-1}
      initialFocus={popupRef}
      className={`${styles.popup} ${styles.modal}`}
    >
      <div className={styles.header}>
        <div className={styles.headerSlot}>
          <AnimatePresence initial={false}>
            {mode === "detail" ? (
              <motion.div
                key="back"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={reduceMotion ? { duration: 0 } : undefined}
              >
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label="Back to all sources"
                  onClick={back}
                >
                  <ChevronLeft />
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.h2
            key={title}
            className={styles.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.12 }}
          >
            <Dialog.Title render={<span />}>{title}</Dialog.Title>
          </motion.h2>
        </AnimatePresence>

        <div className={`${styles.headerSlot} ${styles.headerSlotEnd}`}>
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
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            {mode === "overview" ? (
              <Overview
                key="overview"
                sources={SYNCABLE}
                bySource={bySource}
                summary={summary}
                direction={direction}
                onSelect={openDetail}
              />
            ) : (
              <SourceDetail
                key="detail"
                focused={focused}
                status={bySource[focused]}
                direction={direction}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Dialog.Popup>
  );
}
