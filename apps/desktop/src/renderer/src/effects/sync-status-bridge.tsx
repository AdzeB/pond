import { useEffect } from "react";
import { syncMonitor } from "@/features/library/sync-monitor/store";

// Pipes the main-process sync-status channel into the sync-monitor store.
export function SyncStatusBridge() {
  useEffect(() => {
    return window.pond.onSyncStatus((update) => {
      syncMonitor.ingest(update);
    });
  }, []);

  return null;
}
