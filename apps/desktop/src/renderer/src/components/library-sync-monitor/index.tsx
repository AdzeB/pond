import { IconDotsFill18 as More } from "@pond/icons/fill/18";
import {
  IconAntennaOutline18 as Antenna,
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
import { SourceCard } from "@/components/library-sync-monitor-source-card";
import { SourceDialog } from "@/components/library-sync-monitor-source-dialog";
import { StorageBanner } from "@/components/library-sync-monitor-storage-banner";
import {
  pauseEnrichmentSweep,
  resumeEnrichmentSweep,
} from "@/lib/enrichment/sweep";
import { retryAllFailed } from "@/lib/save/selection";
import { getSourceDef } from "@/lib/save/sources-registry";
import { TASK_GROUPS, TASKS } from "@/lib/save/tasks";
import { type NativeMenuItem, showContextMenu } from "@/lib/ui/native-menu";
import { useEnrichmentStatus } from "@/stores/enrichment-monitor";
import { useGovernorSnapshot } from "@/stores/governor-monitor";
import { usePipelineSnapshot } from "@/stores/pipeline-monitor";
import { useFailedSaveCount } from "@/stores/pool";
import { syncMonitor, useSyncBySource } from "@/stores/sync-monitor";
import { pushToast } from "@/stores/toasts";
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
  const connectedSources = SYNCABLE.filter(
    (s) => bySource[s]?.connected || bySource[s]?.state === "running",
  );
  const connectedCount = connectedSources.length;
  const allConnected = connectedCount === SYNCABLE.length;

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

  // Library-wide tasks, grouped into submenus mirroring the task catalog. Each
  // runs across the whole library (no selection scope) and toasts its result.
  const taskGroupItems: NativeMenuItem[] = TASK_GROUPS.flatMap((group) => {
    const tasks = TASKS.filter((t) => t.group === group.id);
    if (tasks.length === 0) return [];
    return [
      {
        label: group.label,
        submenu: tasks.map((task) => ({
          label: task.label,
          onSelect: async () => {
            try {
              const res = await task.run();
              pushToast(res.message, res.ok ? "success" : "error");
            } catch {
              pushToast(`${task.label} failed.`, "error");
            }
          },
        })),
      },
    ];
  });

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
      { type: "separator" },
      ...taskGroupItems,
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
            <Tooltip label="Add source">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Add source"
                onClick={addSource}
              >
                <Plus width={16} height={16} />
              </Button>
            </Tooltip>
          </div>
          <div className={styles.grid}>
            {connectedSources.map((source) => (
              <SourceCard
                key={source}
                source={source}
                status={bySource[source]}
                onOpen={openSource}
              />
            ))}
            <button
              type="button"
              className={styles.addTile}
              onClick={addSource}
              disabled={allConnected}
            >
              <span className={styles.addSquare}>
                {allConnected ? (
                  <Antenna width={22} height={22} />
                ) : (
                  <Plus width={22} height={22} />
                )}
              </span>
              <span className={styles.addLabel}>
                {allConnected ? "All set" : "Add"}
              </span>
            </button>
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
