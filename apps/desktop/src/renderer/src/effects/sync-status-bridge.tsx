import { useEffect } from "react";
import { syncMonitor } from "@/features/library/sync-monitor/store";

// Pipes the main-process `pond:sync-status` channel into the sync-monitor
// store so the modal reflects live per-source sync runs.
export function SyncStatusBridge() {
  useEffect(() => {
    return window.pond.onSyncStatus((update) => {
      syncMonitor.ingest(update);
    });
  }, []);

  return null;
}
