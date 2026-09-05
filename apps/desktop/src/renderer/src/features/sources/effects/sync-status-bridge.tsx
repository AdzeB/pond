import { useEffect } from "react";
import { syncMonitor } from "@/features/sources/state/sync-monitor";

export function SyncStatusBridge() {
  useEffect(() => {
    return window.pond.onSyncStatus((update) => {
      syncMonitor.ingest(update);
    });
  }, []);

  return null;
}
