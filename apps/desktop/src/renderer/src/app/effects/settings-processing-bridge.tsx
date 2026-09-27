import { useEffect } from "react";
import { enrichmentMonitor } from "@/features/enrichment/state/enrichment-monitor";

export function SettingsProcessingBridge() {
  useEffect(() => {
    if (!window.pond.onProcessingCheck) return;
    let active = true;
    const publish = () => {
      const status = enrichmentMonitor.snapshot();
      void window.pond.sendProcessingStatus({
        inflight: status.inflight,
        activeKeys: [...status.activeKeys],
        failedKeys: [...status.failedKeys],
      });
    };
    const stopCheck = window.pond.onProcessingCheck(() => {
      void import("@/features/enrichment/lib/tasks").then(
        ({ runEnrichment }) => {
          if (active) runEnrichment();
        },
      );
    });
    const subscription = enrichmentMonitor.subscribe(publish);
    void window.pond.processingReady().then(() => {
      if (active) publish();
    });
    return () => {
      active = false;
      stopCheck();
      subscription.unsubscribe();
    };
  }, []);
  return null;
}
