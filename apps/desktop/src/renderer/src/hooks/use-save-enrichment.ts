import { useCallback, useEffect, useMemo } from "react";
import { ENRICHERS_BY_ID } from "@/lib/enrichment/registry";
import { rescanEnrichment } from "@/lib/enrichment/sweep";
import {
  rebuildVisualIndex,
  recaption,
  reembed,
  reocr,
  retranscribe,
} from "@/lib/enrichment/tasks";
import { useEnrichmentStatus } from "@/stores/enrichment-monitor";
import { usePrefsValue } from "@/stores/prefs";
import { useSave } from "./use-saves";

export interface EnricherStatus {
  // Feature toggled on in prefs.
  enabled: boolean;
  // Applies to this save and hasn't produced a current result yet (so the sweep
  // will run it). Always false once stamped, regardless of output.
  eligible: boolean;
  // Running on this save right now.
  running: boolean;
  // Failed this session.
  failed: boolean;
}

// Per-enricher reprocess: clears the stamp/vector for just this save and kicks a
// scoped rescan. Enrichers without a visible re-run path (aesthetic) are omitted.
const REPROCESS: Record<string, (ids: readonly string[]) => unknown> = {
  caption: recaption,
  ocr: reocr,
  transcript: retranscribe,
  textEmbedding: reembed,
  clip: rebuildVisualIndex,
};

// Live, per-save view of the on-device enrichment pipeline. Lets the detail pane
// show whether each enrichment is queued/running/failed and offer scoped
// regenerate / retry actions without touching the rest of the library.
export function useSaveEnrichment(saveId: string) {
  const save = useSave(saveId);
  const prefs = usePrefsValue();
  const { activeKeys, failedKeys, paused } = useEnrichmentStatus();

  // Nudge the sweep to (re)schedule this save's pending enrichments whenever it
  // comes into view, so the item the user is actively looking at gets processed
  // even if the background scan has gone idle (it only re-scans on pool changes
  // or visibility/resume). No-op when paused.
  useEffect(() => {
    rescanEnrichment([saveId]);
  }, [saveId]);

  const statusOf = useCallback(
    (enricherId: string): EnricherStatus => {
      const enricher = ENRICHERS_BY_ID.get(enricherId);
      if (!enricher || !save) {
        return {
          enabled: false,
          eligible: false,
          running: false,
          failed: false,
        };
      }
      const key = `${enricherId}:${saveId}`;
      return {
        enabled: enricher.enabled(prefs),
        eligible: enricher.eligible(save),
        running: activeKeys.has(key),
        failed: failedKeys.has(key),
      };
    },
    [save, saveId, prefs, activeKeys, failedKeys],
  );

  // Force a fresh run of one enricher for this save (clears its stamp + rescans).
  const regenerate = useCallback(
    (enricherId: string) => {
      REPROCESS[enricherId]?.([saveId]);
    },
    [saveId],
  );

  // Retry every failed enricher for this save (clears failure flags + rescans).
  const retry = useCallback(() => {
    rescanEnrichment([saveId]);
  }, [saveId]);

  const canRegenerate = useCallback(
    (enricherId: string) => enricherId in REPROCESS,
    [],
  );

  return useMemo(
    () => ({ statusOf, regenerate, retry, canRegenerate, paused }),
    [statusOf, regenerate, retry, canRegenerate, paused],
  );
}
