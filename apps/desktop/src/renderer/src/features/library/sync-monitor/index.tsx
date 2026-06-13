import { IconXmarkOutline18 as X } from "@pond/icons/outline/18";
import { SOURCES, type Source } from "@pond/schema/db";
import { Button, Dialog } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { drawerSpring } from "@/core/lib/motion";
import { getSourceDef } from "@/features/sources/registry";
import {
  type SyncSourceStatus,
  type SyncState,
  syncMonitor,
  useSyncBySource,
  useSyncOpen,
} from "./store";
import styles from "./styles.module.css";

// Sources in a sync run; `local` holds only manual imports, so it's excluded.
const SYNCABLE: readonly Source[] = SOURCES.filter((s) => s !== "local");

const STATE_LABELS: Record<SyncState, string> = {
  idle: "Idle",
  running: "Syncing",
  done: "Up to date",
  error: "Failed",
  auth_required: "Sign in needed",
};

const MORPH_SPRING = { type: "spring" as const, bounce: 0.18, duration: 0.45 };

// Lower sorts first: attention rows float up, disconnected sinks to the bottom group.
function priority(status: SyncSourceStatus | undefined): number {
  const state = status?.state ?? "idle";
  if (state === "error" || state === "auth_required") return 0;
  if (state === "running") return 1;
  if (status?.connected) return 2;
  return 3;
}

// Measure natural height so only the wrapper morphs while rows snap to final layout.
function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    setHeight(el.offsetHeight);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
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
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

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
        </div>
      </motion.div>
    </Dialog.Popup>
  );
}

function SourceRow({
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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "never";
  const diff = Date.now() - ms;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  if (diff < MONTH) return plural(Math.floor(diff / DAY), "day");
  if (diff < YEAR) return plural(Math.floor(diff / MONTH), "month");
  return plural(Math.floor(diff / YEAR), "year");
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}
