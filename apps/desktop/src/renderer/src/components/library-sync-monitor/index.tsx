import { IconChevronLeftOutline18 as ChevronLeft } from "@pond/icons/outline/18";
import { SOURCES, type Source } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useIntervalWhen } from "rooks";
import { getSourceDef } from "@/lib/sources-registry";
import { backfillMonitor } from "@/stores/backfill-monitor";
import { syncMonitor, useSyncBySource } from "@/stores/sync-monitor";
import { Overview } from "./overview";
import { SourceDetail } from "./source-detail";
import styles from "./styles.module.css";

// Sources you can sync; `local` holds only manual imports, so it's excluded.
const SYNCABLE: readonly Source[] = SOURCES.filter((s) => s !== "local");

type Direction = "forward" | "backward";

// The Sources view (`/sources`). Formerly a dialog; now a first-class page that
// shares the library shell (toolbar + bottom nav) via the route Outlet.
export function SourcesPage() {
  const bySource = useSyncBySource();
  const reduceMotion = useReducedMotion();

  const [mode, setMode] = useState<"overview" | "detail">("overview");
  const [focused, setFocused] = useState<Source>(SYNCABLE[0] ?? "twitter");
  const [direction, setDirection] = useState<Direction>("forward");

  // Seed each source with a one-shot snapshot on mount so the list isn't blank
  // before the first live push.
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

  // Keep relative timestamps ("3 days ago") honest while the page sits open.
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
    <div className={styles.page}>
      <div className={styles.panel}>
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
            <motion.h1
              key={title}
              className={styles.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.12 }}
            >
              {title}
            </motion.h1>
          </AnimatePresence>

          <div className={`${styles.headerSlot} ${styles.headerSlotEnd}`} />
        </div>

        <div className={styles.body}>
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
      </div>
    </div>
  );
}
