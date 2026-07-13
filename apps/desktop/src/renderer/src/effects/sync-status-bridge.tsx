import { useEffect } from "react";
import { syncMonitor } from "@/stores/sync-monitor";

export function SyncStatusBridge() {
  useEffect(() => {
    return window.pond.onSyncStatus((update) => {
      syncMonitor.ingest(update);
    });
  }, []);

  return null;
}
