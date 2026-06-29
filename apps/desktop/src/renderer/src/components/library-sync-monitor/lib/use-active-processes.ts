import {
  pauseEnrichmentSweep,
  resumeEnrichmentSweep,
} from "@/lib/enrichment/sweep";
import { useBackfillStatus } from "@/stores/backfill-monitor";
import { useEnrichmentStatus } from "@/stores/enrichment-monitor";
import { useGovernorSnapshot } from "@/stores/governor-monitor";
import { usePipelineSnapshot } from "@/stores/pipeline-monitor";
import { useRefreshBackfillStatus } from "@/stores/refresh-monitor";

export type ProcessKind =
  | "ingest"
  | "refresh"
  | "screenshot"
  | "enrichment"
  | "governor";

export type ProcessState = "running" | "paused" | "idle";

export interface ProcessItem {
  id: string;
  kind: ProcessKind;
  label: string;
  state: ProcessState;
  message?: string;
  progress?: { current: number; total: number };
  // Hard stop (e.g. cancel ingest, cancel backfill). Absent when not stoppable.
  onCancel?: () => void;
  // Toggles pause/resume; the row uses `state` to choose the label.
  onPause?: () => void;
}

// Composes every non-sync background subsystem into a single list of active
// processes for the Activity view. Source sync keeps its richer rendering and is
// handled separately by the LiveMonitor via the sync-monitor store.
export function useActiveProcesses(): ProcessItem[] {
  const pipeline = usePipelineSnapshot();
  const refresh = useRefreshBackfillStatus();
  const screenshot = useBackfillStatus();
  const enrichment = useEnrichmentStatus();
  const governor = useGovernorSnapshot();

  const items: ProcessItem[] = [];

  // Ingest pipeline ────────────────────────────────────────────────────────
  const ingestActive =
    pipeline.inflight > 0 || pipeline.ingesting > 0 || pipeline.paused;
  if (ingestActive) {
    const parts: string[] = [];
    if (pipeline.inflight > 0) parts.push(`${pipeline.inflight} running`);
    if (pipeline.pending > 0) parts.push(`${pipeline.pending} queued`);
    if (pipeline.ingesting > 0) parts.push(`${pipeline.ingesting} ingesting`);
    items.push({
      id: "ingest",
      kind: "ingest",
      label: "Ingest pipeline",
      state: pipeline.paused
        ? "paused"
        : pipeline.inflight > 0 || pipeline.ingesting > 0
          ? "running"
          : "idle",
      message: pipeline.paused
        ? `Paused${parts.length ? ` · ${parts.join(" · ")}` : ""}`
        : parts.join(" · ") || "Working…",
      onPause: () => void window.pond.pipelinePause(!pipeline.paused),
      onCancel: () => {
        if (
          window.confirm(
            "Stop all in-progress ingests? Affected saves will be marked failed and can be retried later.",
          )
        ) {
          void window.pond.pipelineCancelAll();
        }
      },
    });
  }

  // Metadata refresh backfill ───────────────────────────────────────────────
  if (refresh.state === "running") {
    items.push({
      id: "refresh",
      kind: "refresh",
      label: "Refresh metadata",
      state: "running",
      message: refresh.message,
      progress: { current: refresh.current, total: refresh.total },
      onCancel: () => void window.pond.refreshBackfillCancel(),
    });
  }

  // Screenshot backfill ─────────────────────────────────────────────────────
  if (screenshot.state === "running") {
    items.push({
      id: "screenshot",
      kind: "screenshot",
      label: "Screenshots",
      state: "running",
      message: screenshot.message,
      progress: { current: screenshot.attempted, total: screenshot.total },
      onCancel: () => void window.pond.screenshotBackfillCancel(),
    });
  }

  // On-device enrichment ────────────────────────────────────────────────────
  if (enrichment.inflight > 0 || enrichment.paused) {
    items.push({
      id: "enrichment",
      kind: "enrichment",
      label: "Enrichment",
      state: enrichment.paused
        ? "paused"
        : enrichment.inflight > 0
          ? "running"
          : "idle",
      message: enrichment.paused
        ? `Paused${enrichment.inflight > 0 ? ` · ${enrichment.inflight} finishing` : ""}`
        : `${enrichment.inflight} processing`,
      onPause: () =>
        enrichment.paused ? resumeEnrichmentSweep() : pauseEnrichmentSweep(),
    });
  }

  // Rate governor ───────────────────────────────────────────────────────────
  const governorActive =
    governor.allPaused ||
    governor.paused.length > 0 ||
    governor.atRisk.length > 0;
  if (governorActive) {
    const parts: string[] = [];
    if (governor.paused.length > 0) {
      parts.push(`${governor.paused.length} paused`);
    }
    if (governor.atRisk.length > 0) {
      parts.push(`${governor.atRisk.length} at risk`);
    }
    items.push({
      id: "governor",
      kind: "governor",
      label: "Rate governor",
      state: governor.allPaused ? "paused" : "running",
      message: governor.allPaused
        ? `All sources paused${parts.length ? ` · ${parts.join(" · ")}` : ""}`
        : parts.join(" · ") || "Throttling requests",
      onPause: () => void window.pond.governorSetPaused(!governor.allPaused),
    });
  }

  return items;
}
