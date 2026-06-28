import { SOURCES, type Source } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { useEffect, useState } from "react";
import { useIntervalWhen } from "rooks";
import { useSyncStats } from "@/hooks/use-sync-stats";
import {
  pauseEnrichmentSweep,
  resumeEnrichmentSweep,
} from "@/lib/enrichment/sweep";
import { showContextMenu } from "@/lib/native-menu";
import { retryAllFailed } from "@/lib/selection-actions";
import { getSourceDef } from "@/lib/sources-registry";
import { useEnrichmentStatus } from "@/stores/enrichment-monitor";
import { useGovernorSnapshot } from "@/stores/governor-monitor";
import { usePipelineSnapshot } from "@/stores/pipeline-monitor";
import { useFailedSaveCount } from "@/stores/pool";
import { syncMonitor, useSyncBySource } from "@/stores/sync-monitor";
import type { SyncRun } from "./helpers";
import { KpiCustomizeDialog } from "./kpi-customize-dialog";
import { KpiStrip } from "./kpi-strip";
import { LiveMonitor } from "./live-monitor";
import { RecentRuns } from "./recent-runs";
import { RunDialog } from "./run-dialog";
import { SourceCard } from "./source-card";
import { SourceDialog } from "./source-dialog";
import { StorageBanner } from "./storage-banner";
import styles from "./styles.module.css";
import { TasksPanel } from "./tasks-panel";
import { useActiveProcesses } from "./use-active-processes";

// Sources you can sync; `local` (manual imports) and `web` (generic-link
// fallback) aren't connectable accounts, so they're excluded.
const SYNCABLE: readonly Source[] = SOURCES.filter(
  (s) => s !== "local" && s !== "web",
);

export function SourcesPage() {
  const bySource = useSyncBySource();
  const { stats } = useSyncStats(7);
  const failedCount = useFailedSaveCount();
  const processes = useActiveProcesses();
  const pipeline = usePipelineSnapshot();
  const enrichment = useEnrichmentStatus();
  const governor = useGovernorSnapshot();

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<SyncRun | null>(null);
  const [runOpen, setRunOpen] = useState(false);

  // Seed each source with a one-shot snapshot on mount so the grid isn't blank
  // before the first live push.
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

  // Keep relative timestamps honest while the page sits open.
  const [, setTick] = useState(0);
  useIntervalWhen(() => setTick((t) => t + 1), 30_000, true);

  const syncRunningCount = SYNCABLE.filter(
    (s) => bySource[s]?.state === "running",
  ).length;
  const activeCount =
    syncRunningCount + processes.filter((p) => p.state === "running").length;
  const connectedCount = SYNCABLE.filter(
    (s) => bySource[s]?.connected || bySource[s]?.state === "running",
  ).length;

  const anyPaused = pipeline.paused || enrichment.paused || governor.allPaused;
  const togglePauseAll = () => {
    const next = !anyPaused;
    void window.pond.pipelinePause(next);
    void window.pond.governorSetPaused(next);
    if (next) pauseEnrichmentSweep();
    else resumeEnrichmentSweep();
  };

  const openSource = (source: Source) => {
    setSelectedSource(source);
    setSourceOpen(true);
  };

  const openSyncAllMenu = () => {
    void showContextMenu([
      { label: "Sync all", onSelect: () => void window.pond.syncRunAll() },
      {
        label: "Backfill all",
        onSelect: () => void window.pond.syncRunAll({ forceFull: true }),
      },
      { type: "separator" },
      {
        label: "Refresh all metadata",
        onSelect: () => void window.pond.refreshBackfillStart({}),
      },
      {
        label:
          failedCount > 0
            ? `Retry ${failedCount} failed saves`
            : "Retry failed saves",
        enabled: failedCount > 0,
        onSelect: () => void retryAllFailed(),
      },
    ]);
  };

  const openRun = (run: SyncRun) => {
    setSelectedRun(run);
    setRunOpen(true);
  };

  const addSource = () => {
    const unconnected = SYNCABLE.filter(
      (s) => !(bySource[s]?.connected || bySource[s]?.state === "running"),
    );
    if (unconnected.length === 0) {
      void showContextMenu([
        { label: "All sources connected", enabled: false },
      ]);
      return;
    }
    void showContextMenu(
      unconnected.map((s) => ({
        label: getSourceDef(s).label,
        onSelect: () => void window.pond.connectSource(s),
      })),
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.topbar}>
          <h1>Sources</h1>
          <span className={styles.crumb}>
            {connectedCount} of {SYNCABLE.length} connected
          </span>
          <span className={styles.topRight}>
            {activeCount > 0 ? (
              <span className={styles.live}>
                <span className={styles.liveDot} />
                {activeCount} active now
              </span>
            ) : null}
            <Button variant="secondary" onClick={togglePauseAll}>
              {anyPaused ? "Resume all" : "Pause all"}
            </Button>
            <Button
              variant="primary"
              onClick={() => void window.pond.syncRunAll()}
            >
              Sync all
            </Button>
            <Button
              icon
              variant="secondary"
              aria-label="More sync actions"
              onClick={openSyncAllMenu}
            >
              ▾
            </Button>
          </span>
        </div>

        <StorageBanner />

        <div className={styles.secLabel}>
          Overview
          <button
            type="button"
            className={styles.customize}
            onClick={() => setCustomizeOpen(true)}
          >
            ⚙ Customize
          </button>
        </div>
        <KpiStrip
          sources={SYNCABLE}
          bySource={bySource}
          onCustomize={() => setCustomizeOpen(true)}
        />

        <div className={styles.secLabel}>Activity</div>
        <LiveMonitor
          bySource={bySource}
          processes={processes}
          lastRunAt={stats.lastRunAt}
          onSyncAll={() => void window.pond.syncRunAll()}
        />

        <div className={styles.secLabel}>
          Sources{" "}
          <span className={styles.muted}>· {connectedCount} connected</span>
        </div>
        <div className={styles.grid}>
          {SYNCABLE.map((source) => (
            <SourceCard
              key={source}
              source={source}
              status={bySource[source]}
              onOpen={openSource}
            />
          ))}
          <button
            type="button"
            className={`${styles.card} ${styles.add}`}
            onClick={addSource}
          >
            + Add source
          </button>
        </div>

        <div className={styles.secLabel}>Recent runs</div>
        <RecentRuns onOpenRun={openRun} />

        <div className={styles.secLabel}>
          Tasks{" "}
          <span className={styles.muted}>· run across your whole library</span>
        </div>
        <TasksPanel />
      </div>

      <SourceDialog
        source={selectedSource}
        status={selectedSource ? bySource[selectedSource] : undefined}
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        onOpenRun={openRun}
      />
      <RunDialog run={selectedRun} open={runOpen} onOpenChange={setRunOpen} />
      <KpiCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
      />
    </div>
  );
}
