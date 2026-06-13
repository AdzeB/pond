import { useEffect } from "react";
import { syncMonitor } from "@/stores/sync-monitor";

// Pipes the main-process sync-status channel into the sync-monitor store.
export function SyncStatusBridge() {
  useEffect(() => {
    return window.pond.onSyncStatus((update) => {
      syncMonitor.ingest(update);
    });
  }, []);

  return null;
}
