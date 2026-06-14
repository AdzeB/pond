import { useEffect } from "react";
import { backfillMonitor } from "@/stores/backfill-monitor";

// Pipes the main-process screenshot-backfill channel into the backfill-monitor store.
export function BackfillStatusBridge() {
  useEffect(() => {
    return window.pond.onScreenshotBackfillStatus((status) => {
      backfillMonitor.ingest(status);
    });
  }, []);

  return null;
}
