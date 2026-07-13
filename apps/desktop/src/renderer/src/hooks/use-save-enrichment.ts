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

interface EnricherStatus {
  /** Feature toggled on in prefs. */
  enabled: boolean;
  /** Applies to this save with no current result yet, so the sweep will run it; always false once stamped, regardless of output. */
  eligible: boolean;
  running: boolean;
  /** Failed this session. */
  failed: boolean;
}

/** Clears the stamp/vector for just this save and kicks a scoped rescan; enrichers without a visible re-run path are omitted. */
const REPROCESS: Record<string, (ids: readonly string[]) => unknown> = {
  caption: recaption,
  ocr: reocr,
  transcript: retranscribe,
  textEmbedding: reembed,
  clip: rebuildVisualIndex,
};

export function useSaveEnrichment(saveId: string) {
  const save = useSave(saveId);
  const prefs = usePrefsValue();
  const { activeKeys, failedKeys } = useEnrichmentStatus();

  /** The background scan only re-scans on pool changes or visibility/resume, so nudge it here so the save the user is looking at gets processed. */
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

  const regenerate = useCallback(
    (enricherId: string) => {
      REPROCESS[enricherId]?.([saveId]);
    },
    [saveId],
  );

  /** rescanEnrichment clears failure flags before re-running, so this retries every failed enricher. */
  const retry = useCallback(() => {
    rescanEnrichment([saveId]);
  }, [saveId]);

  const canRegenerate = useCallback(
    (enricherId: string) => enricherId in REPROCESS,
    [],
  );

  return useMemo(
    () => ({ statusOf, regenerate, retry, canRegenerate }),
    [statusOf, regenerate, retry, canRegenerate],
  );
}
