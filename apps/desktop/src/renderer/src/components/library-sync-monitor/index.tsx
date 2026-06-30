import { IconDotsFill18 as More } from "@pond/icons/fill/18";
import {
  IconChevronDownOutline18 as Chevron,
  IconPlusOutline18 as Plus,
  IconSliders3Outline18 as Sliders,
} from "@pond/icons/outline/18";
import { SOURCES, type Source } from "@pond/schema/db";
import { Accordion, Button, Tooltip } from "@pond/ui";
import { useEffect, useState } from "react";
import { useIntervalWhen } from "rooks";
import { KpiCustomizeDialog } from "@/components/library-sync-monitor-kpi-customize-dialog";
import { KpiStrip } from "@/components/library-sync-monitor-kpi-strip";
import { LiveMonitor } from "@/components/library-sync-monitor-live-monitor";
import { RecentRuns } from "@/components/library-sync-monitor-recent-runs";
import { RunDialog } from "@/components/library-sync-monitor-run-dialog";
import { SourceDialog } from "@/components/library-sync-monitor-source-dialog";
import { SourceRow } from "@/components/library-sync-monitor-source-row";
import { StorageBanner } from "@/components/library-sync-monitor-storage-banner";
import { TasksPanel } from "@/components/library-sync-monitor-tasks-panel";
import {
  pauseEnrichmentSweep,
  resumeEnrichmentSweep,
} from "@/lib/enrichment/sweep";
import { retryAllFailed } from "@/lib/save/selection";
import { getSourceDef } from "@/lib/save/sources-registry";
import { showContextMenu } from "@/lib/ui/native-menu";
import { useEnrichmentStatus } from "@/stores/enrichment-monitor";
import { useGovernorSnapshot } from "@/stores/governor-monitor";
import { usePipelineSnapshot } from "@/stores/pipeline-monitor";
import { useFailedSaveCount } from "@/stores/pool";
import { syncMonitor, useSyncBySource } from "@/stores/sync-monitor";
import type { SyncRun } from "./lib/helpers";
import { useActiveProcesses } from "./lib/use-active-processes";
import styles from "./styles.module.css";

// Sources you can sync; `local` (manual imports) and `web` (generic-link
// fallback) aren't connectable accounts, so they're excluded.
const SYNCABLE: readonly Source[] = SOURCES.filter(
  (s) => s !== "local" && s !== "web",
);

export function SourcesPage() {
  const bySource = useSyncBySource();
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

  // Seed each source with a one-shot snapshot on mount so the list isn't blank
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

  const hasActivity = processes.length > 0;
  const secondaryOpen = hasActivity ? ["activity"] : [];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Sources</h1>
            <p className={styles.subtitle}>
              {connectedCount} of {SYNCABLE.length} connected
              {activeCount > 0 ? (
                <span className={styles.active}>
                  <span className={styles.activeDot} />
                  {activeCount} active
                </span>
              ) : null}
            </p>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={togglePauseAll}>
              {anyPaused ? "Resume all" : "Pause all"}
            </Button>
            <Button
              variant="primary"
              onClick={() => void window.pond.syncRunAll()}
            >
              Sync all
            </Button>
            <Tooltip label="More sync actions">
              <Button
                icon
                variant="secondary"
                aria-label="More sync actions"
                onClick={openSyncAllMenu}
              >
                <More width={16} height={16} />
              </Button>
            </Tooltip>
          </div>
        </header>

        <StorageBanner />

        <section className={styles.section}>
          <div className={styles.secHead}>
            <span className={styles.secLabel}>Overview</span>
            <Tooltip label="Customize metrics">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Customize metrics"
                className={styles.secAction}
                onClick={() => setCustomizeOpen(true)}
              >
                <Sliders width={16} height={16} />
              </Button>
            </Tooltip>
          </div>
          <KpiStrip
            sources={SYNCABLE}
            bySource={bySource}
            onCustomize={() => setCustomizeOpen(true)}
          />
        </section>

        <section className={styles.section}>
          <div className={styles.secHead}>
            <span className={styles.secLabel}>Sources</span>
            <span className={styles.secMeta}>{connectedCount} connected</span>
          </div>
          <div className={styles.list}>
            {SYNCABLE.map((source) => (
              <SourceRow
                key={source}
                source={source}
                status={bySource[source]}
                onOpen={openSource}
              />
            ))}
            <Button
              variant="ghost"
              className={styles.addRow}
              onClick={addSource}
            >
              <Plus width={16} height={16} />
              Add source
            </Button>
          </div>
        </section>

        <Accordion.Root
          className={styles.acc}
          defaultValue={secondaryOpen}
          multiple
        >
          {hasActivity ? (
            <Accordion.Item className={styles.accItem} value="activity">
              <Accordion.Header className={styles.accHeader}>
                <Accordion.Trigger className={styles.accTrigger}>
                  <span className={styles.accLabel}>Activity</span>
                  <span className={styles.accMeta}>{activeCount} running</span>
                  <Chevron
                    className={styles.accChevron}
                    width={16}
                    height={16}
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className={styles.accPanel}>
                <LiveMonitor processes={processes} />
              </Accordion.Panel>
            </Accordion.Item>
          ) : null}

          <Accordion.Item className={styles.accItem} value="runs">
            <Accordion.Header className={styles.accHeader}>
              <Accordion.Trigger className={styles.accTrigger}>
                <span className={styles.accLabel}>Recent runs</span>
                <Chevron className={styles.accChevron} width={16} height={16} />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className={styles.accPanel}>
              <RecentRuns onOpenRun={openRun} />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className={styles.accItem} value="tasks">
            <Accordion.Header className={styles.accHeader}>
              <Accordion.Trigger className={styles.accTrigger}>
                <span className={styles.accLabel}>Tasks</span>
                <span className={styles.accMeta}>
                  run across your whole library
                </span>
                <Chevron className={styles.accChevron} width={16} height={16} />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className={styles.accPanel}>
              <TasksPanel />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
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
