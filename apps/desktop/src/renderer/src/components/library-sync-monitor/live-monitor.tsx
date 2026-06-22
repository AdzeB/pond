import type { Source } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { relativeTimeFromMs } from "@/lib/relative-time";
import { getSourceDef } from "@/lib/sources-registry";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import { BrandTile } from "./source-tile";
import styles from "./styles.module.css";

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Tracks first-observed running timestamps so the monitor can show a live
// elapsed clock even though the store doesn't carry a run start time.
function useElapsed(runningKey: string): (source: Source) => number {
  const starts = useRef(new Map<string, number>());
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const active = new Set(runningKey ? runningKey.split(",") : []);
  for (const s of active) {
    if (!starts.current.has(s)) starts.current.set(s, Date.now());
  }
  for (const s of [...starts.current.keys()]) {
    if (!active.has(s)) starts.current.delete(s);
  }

  return (source: Source) =>
    Date.now() - (starts.current.get(source) ?? Date.now());
}

export function LiveMonitor({
  bySource,
  lastRunAt,
  onSyncAll,
}: {
  bySource: Partial<Record<Source, SyncSourceStatus>>;
  lastRunAt: number | null;
  onSyncAll: () => void;
}) {
  const running = (Object.keys(bySource) as Source[]).filter(
    (s) => bySource[s]?.state === "running",
  );
  const runningKey = running.join(",");
  const elapsedOf = useElapsed(runningKey);

  if (running.length === 0) {
    return (
      <div className={styles.monitor}>
        <div className={styles.idle}>
          <span className={styles.ii} aria-hidden>
            ◴
          </span>
          <div className={styles.it}>
            <div className={styles.itn}>No active sync</div>
            <div className={styles.its}>
              All sources are up to date. Last run{" "}
              {relativeTimeFromMs(lastRunAt, "—")}.
            </div>
          </div>
          <Button variant="primary" onClick={onSyncAll}>
            Sync all
          </Button>
        </div>
      </div>
    );
  }

  const [primary, ...rest] = running;
  if (!primary) return null;
  return (
    <div className={styles.monitor}>
      <Primary
        source={primary}
        status={bySource[primary]}
        elapsedMs={elapsedOf(primary)}
      />
      {rest.map((s) => (
        <Mini
          key={s}
          source={s}
          status={bySource[s]}
          elapsedMs={elapsedOf(s)}
        />
      ))}
    </div>
  );
}

function Primary({
  source,
  status,
  elapsedMs,
}: {
  source: Source;
  status: SyncSourceStatus | undefined;
  elapsedMs: number;
}) {
  const def = getSourceDef(source);
  const progress = status?.progress;
  const determinate = !!progress?.total;
  const pct = determinate
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;
  // Progress implies the harvest stage already produced a candidate set.
  const enqueueActive = determinate;

  return (
    <>
      <div className={styles.monTop}>
        <span className={styles.monIco}>
          <BrandTile source={source} size={46} />
          <span className={styles.spinner} aria-hidden />
        </span>
        <div className={styles.monId}>
          <div className={styles.monName}>
            {def.label}
            <span className={styles.runtag}>
              <span className={styles.d} />
              running
            </span>
          </div>
          <div className={styles.monSub}>
            <span className={styles.typepill}>Sync</span>
            {status?.message ? (
              <span>{status.message}</span>
            ) : (
              <span>Working…</span>
            )}
          </div>
        </div>
        <div className={styles.monElapsed}>
          <div className={styles.t}>{fmtElapsed(elapsedMs)}</div>
          <div className={styles.e}>elapsed</div>
        </div>
        <button
          type="button"
          className={styles.monCancel}
          onClick={() => void window.pond.syncCancel(source)}
        >
          Cancel
        </button>
      </div>

      <div className={styles.stages}>
        <span
          className={`${styles.stage} ${enqueueActive ? styles.done : styles.active}`}
        >
          <span className={styles.pn}>{enqueueActive ? "✓" : "●"}</span>
          Harvest
        </span>
        <span className={styles.line} />
        <span
          className={`${styles.stage} ${enqueueActive ? styles.active : ""}`}
        >
          <span className={styles.pn}>●</span>
          Enqueue
          {enqueueActive ? (
            <span className={styles.sc}>queueing into pipeline</span>
          ) : null}
        </span>
      </div>

      <div className={styles.progress}>
        <div className={styles.track}>
          {determinate ? (
            <div className={styles.fillbar} style={{ width: `${pct}%` }} />
          ) : (
            <div className={styles.indet} />
          )}
        </div>
        <div className={styles.pmeta}>
          <span className={styles.counts}>{status?.message ?? "Syncing…"}</span>
          {determinate ? (
            <span className={styles.pct}>
              {progress.current} / {progress.total} · {pct}%
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Mini({
  source,
  status,
  elapsedMs,
}: {
  source: Source;
  status: SyncSourceStatus | undefined;
  elapsedMs: number;
}) {
  const def = getSourceDef(source);
  return (
    <div className={styles.mini}>
      <BrandTile source={source} size={32} />
      <div className={styles.mt}>
        <div className={styles.mn}>
          {def.label}
          <span className={styles.typepill}>Sync</span>
        </div>
        <div className={styles.mtrack}>
          <div className={styles.indet} />
        </div>
        <div className={styles.ms}>{status?.message ?? "Working…"}</div>
      </div>
      <span className={styles.me}>{fmtElapsed(elapsedMs)}</span>
      <button
        type="button"
        className={styles.monCancel}
        onClick={() => void window.pond.syncCancel(source)}
      >
        Cancel
      </button>
    </div>
  );
}
