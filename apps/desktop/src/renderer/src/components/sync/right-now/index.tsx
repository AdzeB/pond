import { SOURCES } from "@pond/schema/db";
import { AlertDialog, Button, useToast } from "@pond/ui";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import {
  Globe,
  Layers,
  Pause,
  Play,
  RefreshCw,
  SkipForward,
  Square,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSourceLabel } from "@/lib/source-labels";
import { useSaves } from "@/pool/hooks";
import { trashSave } from "@/pool/mutate-save";
import { savesStore } from "@/pool/pool";
import type {
  PipelineMetricsWire,
  ProcessingProgressWire,
} from "../../../../../preload";
import {
  describeCounts,
  describeGate,
  describeIngestingStage,
  displayUrl,
  explainTaskError,
  formatRelative,
  type ProcessingDetail,
  type ProcessingDetailsPayload,
  paneTitle,
  type Selection,
  STAGE_LABELS,
} from "./helpers";
import styles from "./styles.module.css";

const REFRESH_DEBOUNCE_MS = 150;
const METRICS_POLL_MS = 2_000;

export function RightNow() {
  const saves = useSaves();
  const poolCounts = useMemo(() => {
    let ingesting = 0;
    let failed = 0;
    for (const s of saves) {
      if (s.deletedAt) continue;
      if (s.status === "ingesting") ingesting += 1;
      else if (s.status === "failed") failed += 1;
    }
    return { ingesting, failed, total: ingesting + failed };
  }, [saves]);

  const [payload, setPayload] = useState<ProcessingDetailsPayload | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProcessingProgressWire | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "all" });
  const [metrics, setMetrics] = useState<PipelineMetricsWire | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const toast = useToast();

  const refresh = useCallback(async () => {
    const next = (await window.pond.query(
      "saves.processingDetails",
    )) as ProcessingDetailsPayload;
    setPayload(next);
  }, []);

  const scheduleRefresh = useDebouncedCallback(
    () => {
      void refresh();
    },
    { wait: REFRESH_DEBOUNCE_MS },
  );

  const active = poolCounts.total > 0;

  useEffect(() => {
    if (!active) return;
    void refresh();
    const sub = savesStore.subscribe(() => {
      scheduleRefresh();
    });
    return () => {
      sub.unsubscribe();
    };
  }, [active, refresh, scheduleRefresh]);

  useEffect(() => {
    if (!active) return;
    const off = window.pond.onProcessingProgress((status) => {
      setProgress(status);
      scheduleRefresh();
    });
    return off;
  }, [active, scheduleRefresh]);

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const tick = async () => {
      const next = (await window.pond.query(
        "pipeline.metrics",
      )) as PipelineMetricsWire;
      if (!cancelled) setMetrics(next);
    };
    void tick();
    const handle = window.setInterval(tick, METRICS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [active]);

  const rows = payload?.rows ?? [];
  const truncated = payload?.truncated ?? 0;

  const counts = useMemo(() => {
    const bySource = new Map<string, { ingesting: number; failed: number }>();
    let totalIngesting = 0;
    let totalFailed = 0;
    for (const row of rows) {
      const entry = bySource.get(row.source) ?? { ingesting: 0, failed: 0 };
      if (row.status === "ingesting") {
        entry.ingesting += 1;
        totalIngesting += 1;
      } else {
        entry.failed += 1;
        totalFailed += 1;
      }
      bySource.set(row.source, entry);
    }
    return { bySource, totalIngesting, totalFailed };
  }, [rows]);

  const railSources = useMemo(() => {
    const known = SOURCES.filter((s) => counts.bySource.has(s));
    const knownSet = new Set<string>(SOURCES);
    const unknown = [...counts.bySource.keys()]
      .filter((s) => !knownSet.has(s))
      .sort();
    return [...known, ...unknown];
  }, [counts.bySource]);

  const pausedSourceReasons = useMemo(() => {
    const map = new Map<string, "cooldown" | "breaker">();
    for (const entry of metrics?.pausedSources ?? []) {
      map.set(entry.source, entry.reason);
    }
    return map;
  }, [metrics?.pausedSources]);

  useEffect(() => {
    if (selection.kind === "source" && !counts.bySource.has(selection.source)) {
      setSelection({ kind: "all" });
    } else if (selection.kind === "failed" && counts.totalFailed === 0) {
      setSelection({ kind: "all" });
    }
  }, [selection, counts]);

  const visibleRows = useMemo(() => {
    if (selection.kind === "all") return rows;
    if (selection.kind === "failed") {
      return rows.filter((r) => r.status === "failed");
    }
    return rows.filter((r) => r.source === selection.source);
  }, [rows, selection]);

  const visibleIngesting = visibleRows.filter((r) => r.status === "ingesting");
  const visibleFailed = visibleRows.filter((r) => r.status === "failed");

  const handleRetry = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        const res = (await window.pond.query("saves.retryFailed", { id })) as {
          ok: boolean;
          reason?: string;
        };
        if (!res.ok) {
          toast.add({
            title: "Couldn't retry",
            description: res.reason ?? undefined,
            type: "error",
          });
        }
      } finally {
        setBusyId(null);
        void refresh();
      }
    },
    [refresh, toast],
  );

  const handleOpen = useCallback(
    async (url: string) => {
      try {
        await window.pond.openExternal(url);
      } catch {
        toast.add({ title: "Couldn't open URL", type: "error" });
      }
    },
    [toast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await trashSave(id);
        toast.add({ title: "Moved to trash", type: "success" });
      } finally {
        setBusyId(null);
        void refresh();
      }
    },
    [refresh, toast],
  );

  const handleSkipStage = useCallback(
    async (row: ProcessingDetail) => {
      if (!row.stageTaskId) return;
      setBusyId(row.id);
      try {
        const res = (await window.pond.query("tasks.skip", {
          taskId: row.stageTaskId,
          reason: "user:skip-stage",
        })) as { ok: boolean; reason?: string };
        if (!res.ok) {
          toast.add({
            title: "Couldn't skip",
            description: res.reason ?? undefined,
            type: "error",
          });
        }
      } finally {
        setBusyId(null);
        void refresh();
      }
    },
    [refresh, toast],
  );

  const handleRetryAll = useCallback(async () => {
    const res = (await window.pond.query("saves.retryAllFailed")) as
      | { ok: true; total: number }
      | { ok: false; reason: "already_running" | "no_saves" };
    if (!res.ok) {
      const label =
        res.reason === "already_running"
          ? "Retry already in progress"
          : "Nothing to retry";
      toast.add({ title: label });
    }
  }, [toast]);

  const handleCancelRetryAll = useCallback(async () => {
    await window.pond.query("saves.cancelRetryAllFailed");
  }, []);

  const handleTogglePause = useCallback(async () => {
    const target = metrics?.paused ? "pipeline.resume" : "pipeline.pause";
    const res = (await window.pond.query(target)) as {
      ok: boolean;
      paused: boolean;
    };
    if (res.ok) {
      setMetrics((prev) => (prev ? { ...prev, paused: res.paused } : prev));
    }
  }, [metrics?.paused]);

  const clearScope = useMemo(() => {
    if (selection.kind === "failed") {
      return {
        label: "Clear failed",
        count: counts.totalFailed,
        params: { statuses: ["failed"] as const },
        confirmTitle: "Clear failed saves?",
        confirmBody: `Permanently remove ${counts.totalFailed} failed save${counts.totalFailed === 1 ? "" : "s"} from the queue. Undo with \u2318Z.`,
      };
    }
    if (selection.kind === "source") {
      const entry = counts.bySource.get(selection.source);
      const total = (entry?.ingesting ?? 0) + (entry?.failed ?? 0);
      const label = getSourceLabel(selection.source);
      return {
        label: `Clear ${label}`,
        count: total,
        params: {
          source: selection.source,
          statuses: ["ingesting", "failed"] as const,
        },
        confirmTitle: `Clear ${label} queue?`,
        confirmBody: `Permanently remove ${total} ${label} save${total === 1 ? "" : "s"}, including anything still processing. Undo with \u2318Z.`,
      };
    }
    return {
      label: "Clear queue",
      count: counts.totalIngesting + counts.totalFailed,
      params: { statuses: ["ingesting", "failed"] as const },
      confirmTitle: "Clear the whole queue?",
      confirmBody: `Permanently remove every processing and failed save (${counts.totalIngesting + counts.totalFailed}). Undo with \u2318Z.`,
    };
  }, [selection, counts]);

  const handleClearQueue = useCallback(async () => {
    setClearing(true);
    try {
      const res = (await window.pond.query("saves.clearQueue", {
        ...(("source" in clearScope.params
          ? { source: clearScope.params.source }
          : {}) as { source?: string }),
        statuses: [...clearScope.params.statuses],
      })) as { ok: boolean; count: number };
      if (res.ok) {
        toast.add({
          title:
            res.count === 0
              ? "Nothing to clear"
              : `Cleared ${res.count} save${res.count === 1 ? "" : "s"}`,
          type: "success",
        });
      }
    } finally {
      setClearing(false);
      setConfirmClear(false);
      void refresh();
    }
  }, [clearScope, refresh, toast]);

  if (!active) return null;

  const backfillRunning = progress?.state === "running";
  const backfillMessage = progress?.message;
  const paused = metrics?.paused === true;
  const inflightTotal = metrics?.inflightGlobal ?? 0;
  const queuedTotal = Math.max(0, counts.totalIngesting - inflightTotal);

  return (
    <section className={styles.panel}>
      <aside className={styles.rail}>
        <RailRow
          icon={<Layers width="0.95em" height="0.95em" />}
          label="All"
          count={counts.totalIngesting + counts.totalFailed}
          selected={selection.kind === "all"}
          onSelect={() => setSelection({ kind: "all" })}
        />
        {railSources.map((source) => {
          const entry = counts.bySource.get(source);
          if (!entry) return null;
          return (
            <RailRow
              key={source}
              label={getSourceLabel(source)}
              count={entry.ingesting + entry.failed}
              gate={pausedSourceReasons.get(source) ?? null}
              selected={
                selection.kind === "source" && selection.source === source
              }
              onSelect={() => setSelection({ kind: "source", source })}
            />
          );
        })}
        {counts.totalFailed > 0 ? (
          <>
            <hr className={styles["rail-divider"]} />
            <RailRow
              icon={<TriangleAlert width="0.95em" height="0.95em" />}
              label="Failed"
              count={counts.totalFailed}
              tone="danger"
              selected={selection.kind === "failed"}
              onSelect={() => setSelection({ kind: "failed" })}
            />
          </>
        ) : null}
      </aside>

      <div className={styles.pane}>
        <header className={styles.header}>
          <h2>{paneTitle(selection)}</h2>
          <p>{describeCounts(visibleIngesting.length, visibleFailed.length)}</p>
          <div className={styles["header-actions"]}>
            <button
              type="button"
              className={styles["icon-button"]}
              data-active={paused ? "true" : undefined}
              onClick={handleTogglePause}
              title={paused ? "Resume processing" : "Pause processing"}
              aria-label={paused ? "Resume processing" : "Pause processing"}
            >
              {paused ? (
                <Play width="0.95em" height="0.95em" />
              ) : (
                <Pause width="0.95em" height="0.95em" />
              )}
            </button>
            {backfillRunning ? (
              <button
                type="button"
                className={styles["retry-all"]}
                data-variant="stop"
                onClick={handleCancelRetryAll}
                title="Stop the in-progress retry"
              >
                <Square width="0.85em" height="0.85em" />
                <span>Stop retrying</span>
              </button>
            ) : counts.totalFailed > 0 ? (
              <button
                type="button"
                className={styles["retry-all"]}
                onClick={handleRetryAll}
              >
                <RefreshCw width="0.85em" height="0.85em" />
                <span>{`Retry all failed (${counts.totalFailed})`}</span>
              </button>
            ) : null}
            {clearScope.count > 0 ? (
              <button
                type="button"
                className={styles["retry-all"]}
                data-variant="danger"
                onClick={() => setConfirmClear(true)}
                title={`${clearScope.label} (moves ${clearScope.count} to trash)`}
              >
                <Trash2 width="0.85em" height="0.85em" />
                <span>{`${clearScope.label} (${clearScope.count})`}</span>
              </button>
            ) : null}
          </div>
        </header>

        {(metrics && (inflightTotal > 0 || queuedTotal > 0 || paused)) ||
        truncated > 0 ? (
          <div className={styles.chips}>
            {paused ? (
              <span
                className={styles.chip}
                data-tone="warn"
                title="The reconciler is paused. No new tasks will dispatch."
              >
                Paused
              </span>
            ) : null}
            {inflightTotal > 0 ? (
              <span className={styles.chip}>{inflightTotal} active</span>
            ) : null}
            {queuedTotal > 0 ? (
              <span className={styles.chip}>{queuedTotal} queued</span>
            ) : null}
            {(metrics?.pausedSources ?? []).map((entry) => {
              const desc = describeGate(
                entry.reason,
                entry.until,
                now,
                getSourceLabel(entry.source),
              );
              return (
                <span
                  key={entry.source}
                  className={styles.chip}
                  data-tone={entry.reason === "breaker" ? "danger" : "warn"}
                  title={desc.long}
                >
                  {desc.short}
                </span>
              );
            })}
            {truncated > 0 ? (
              <span
                className={styles.chip}
                data-tone="muted"
                title="The panel caps at 500 rows. Clear or retry to see the rest."
              >
                +{truncated} more
              </span>
            ) : null}
          </div>
        ) : null}

        {selection.kind === "source" &&
        pausedSourceReasons.has(selection.source) ? (
          <p className={styles.notice} data-tone="warn">
            {
              describeGate(
                pausedSourceReasons.get(selection.source) ?? "cooldown",
                metrics?.pausedSources.find(
                  (e) => e.source === selection.source,
                )?.until ?? now,
                now,
                getSourceLabel(selection.source),
              ).long
            }
          </p>
        ) : null}

        {paused && visibleRows.length === 0 ? (
          <p className={styles.notice} data-tone="warn">
            Processing is paused. Hit play to resume.
          </p>
        ) : null}

        {backfillRunning && backfillMessage ? (
          <p className={styles["backfill-status"]}>{backfillMessage}</p>
        ) : null}

        <div className={styles.scroll}>
          {visibleIngesting.length > 0 ? (
            <section className={styles.section}>
              <h3 className={styles["section-title"]}>
                Ingesting{" "}
                <span className={styles["section-count"]}>
                  {visibleIngesting.length}
                </span>
              </h3>
              <ul className={styles.list}>
                {visibleIngesting.map((row) => {
                  const stage = describeIngestingStage(row, now);
                  return (
                    <li
                      key={row.id}
                      className={styles.row}
                      data-status="ingesting"
                    >
                      <div className={styles.body}>
                        <span className={styles.title} title={row.url}>
                          {row.title?.trim() || displayUrl(row.url)}
                        </span>
                        <span
                          className={styles.stage}
                          data-tone={stage.tone}
                          title={stage.hint}
                        >
                          {stage.label}
                        </span>
                      </div>
                      <ProgressBar
                        done={row.progress.done}
                        total={row.progress.total}
                      />
                      {row.stageTaskId ? (
                        <button
                          type="button"
                          className={styles["row-button"]}
                          aria-label="Skip current step"
                          title="Skip current step (marks save failed)"
                          onClick={() => handleSkipStage(row)}
                          disabled={busyId === row.id}
                        >
                          <SkipForward width="0.95em" height="0.95em" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {visibleFailed.length > 0 ? (
            <section className={styles.section}>
              <h3 className={styles["section-title"]}>
                Failed{" "}
                <span className={styles["section-count"]}>
                  {visibleFailed.length}
                </span>
              </h3>
              <ul className={styles.list}>
                {visibleFailed.map((row) => {
                  const explain = explainTaskError(
                    row.lastErrorName,
                    row.lastError,
                    row.source,
                    row.stageOp,
                  );
                  const dwell = formatRelative(now, row.lastErrorAt);
                  const detailParts = [explain.hint, row.lastError].filter(
                    Boolean,
                  );
                  return (
                    <li
                      key={row.id}
                      className={styles.row}
                      data-status="failed"
                    >
                      <div className={styles.body}>
                        <span className={styles.title} title={row.url}>
                          {row.title?.trim() || displayUrl(row.url)}
                        </span>
                        <span
                          className={styles.error}
                          data-tone={explain.tone}
                          title={detailParts.join("\n\n") || undefined}
                        >
                          {explain.short}
                          {dwell ? (
                            <span className={styles["error-meta"]}>
                              {" · "}
                              {dwell}
                              {row.stageOp
                                ? ` · ${STAGE_LABELS[row.stageOp]}`
                                : ""}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles["row-button"]}
                          aria-label="Retry"
                          title="Retry"
                          onClick={() => handleRetry(row.id)}
                          disabled={busyId === row.id}
                        >
                          <RefreshCw width="0.95em" height="0.95em" />
                        </button>
                        <button
                          type="button"
                          className={styles["row-button"]}
                          aria-label="Open URL"
                          title="Open URL"
                          onClick={() => handleOpen(row.url)}
                        >
                          <Globe width="0.95em" height="0.95em" />
                        </button>
                        <button
                          type="button"
                          className={styles["row-button"]}
                          aria-label="Delete"
                          title="Delete"
                          onClick={() => handleDelete(row.id)}
                          disabled={busyId === row.id}
                        >
                          <Trash2 width="0.95em" height="0.95em" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {payload && visibleRows.length === 0
            ? renderEmpty(selection, rows.length === 0)
            : null}
        </div>
      </div>

      <AlertDialog.Root open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>{clearScope.confirmTitle}</AlertDialog.Title>
            <AlertDialog.Description>
              {clearScope.confirmBody}
            </AlertDialog.Description>
            <AlertDialog.Actions>
              <AlertDialog.Close
                render={<Button variant="ghost">Cancel</Button>}
              />
              <AlertDialog.Close
                render={
                  <Button
                    variant="danger"
                    disabled={clearing}
                    onClick={(e) => {
                      e.preventDefault();
                      void handleClearQueue();
                    }}
                  >
                    Clear
                  </Button>
                }
              />
            </AlertDialog.Actions>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}

interface RailRowProps {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
  tone?: "danger";
  gate?: "cooldown" | "breaker" | null;
}

function RailRow({
  label,
  count,
  selected,
  onSelect,
  icon,
  tone,
  gate,
}: RailRowProps) {
  return (
    <button
      type="button"
      className={styles["rail-row"]}
      data-selected={selected ? "true" : undefined}
      data-tone={tone}
      data-gate={gate ?? undefined}
      onClick={onSelect}
      title={
        gate === "breaker"
          ? `${label}: paused (circuit breaker)`
          : gate === "cooldown"
            ? `${label}: waiting (rate limit)`
            : undefined
      }
    >
      {icon ? <span className={styles["rail-icon"]}>{icon}</span> : null}
      <span className={styles["rail-label"]}>{label}</span>
      <span className={styles["rail-count"]}>{count}</span>
    </button>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <span
      className={styles.progress}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${done} of ${total} tasks done`}
    >
      <span
        className={styles["progress-fill"]}
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </span>
  );
}

function renderEmpty(selection: Selection, totallyEmpty: boolean) {
  if (totallyEmpty) {
    return <p className={styles.empty}>Nothing to show.</p>;
  }
  if (selection.kind === "source") {
    return (
      <p className={styles.empty}>
        Nothing left in {getSourceLabel(selection.source)}.
      </p>
    );
  }
  if (selection.kind === "failed") {
    return (
      <p className={styles.empty}>
        Nothing failed right now. Anything that errors out will show up here
        with a plain-English explanation.
      </p>
    );
  }
  return <p className={styles.empty}>Nothing to show.</p>;
}
