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
import styles from "@/components/library-sync-monitor/styles.module.css";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { getSourceDef } from "@/lib/save/sources-registry";

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
    <Dialog.Popup className={styles.dlgPopup}>
      <div className={styles.dlgHead}>
        <BrandTile source={run.source} size={44} />
        <div className={styles.dh}>
          <Dialog.Title className={styles.dn}>
            {def.label}
            <span className={`${styles.rout} ${styles[tone]}`}>
              <span className={styles.od} />
              {runLabel(run)}
            </span>
          </Dialog.Title>
          <div className={styles.ds}>
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

      <div className={styles.dlgBody}>
        <div className={styles.dsec}>
          <div className={styles.dt}>Pipeline</div>
          <div className={styles.flow}>
            <div className={styles.fstep}>
              <div className={styles.fn}>Harvest</div>
              <div className={styles.fv}>
                {harvest?.seen ?? "—"} <span className={styles.dim}>seen</span>{" "}
                · {harvest?.fresh ?? "—"}{" "}
                <span className={styles.dim}>new</span>
              </div>
            </div>
            <div className={styles.farrow}>→</div>
            <div className={styles.fstep}>
              <div className={styles.fn}>Enqueue</div>
              <div className={styles.fv}>
                {enqueue?.succeeded ?? "—"}{" "}
                <span className={styles.dim}>queued</span> ·{" "}
                {enqueue?.failed ?? 0}{" "}
                <span className={styles.dim}>failed</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.dsec}>
          <div className={styles.dt}>Run</div>
          <div className={styles.kv}>
            <span className={styles.kk}>Outcome</span>
            <span
              className={`${styles.vv} ${
                isError ? styles.err : tone === "ok" ? styles.ok : styles.muted
              }`}
            >
              {describeRun(run)}
            </span>
          </div>
          <div className={styles.kv}>
            <span className={styles.kk}>Trigger</span>
            <span className={styles.vv}>{titleTrigger(run.trigger)}</span>
          </div>
          <div className={styles.kv}>
            <span className={styles.kk}>Duration</span>
            <span className={styles.vv}>
              {formatRunDuration(run.durationMs)}
            </span>
          </div>
          <div className={styles.kv}>
            <span className={styles.kk}>Watchdog</span>
            <span className={`${styles.vv} ${styles.muted}`}>
              {run.watchdogTripped ? "Reset stalled run" : "Not tripped"}
            </span>
          </div>
        </div>

        {isError && run.error ? (
          <div className={styles.dsec}>
            <div className={styles.dt}>Error</div>
            <div className={styles.errbox}>
              <div className={styles.en}>{run.error.name || "Error"}</div>
              <div className={styles.em}>{run.error.message}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.dlgActions}>
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
