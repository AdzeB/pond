import { useEffect } from "react";
import { refreshMonitor } from "@/stores/refresh-monitor";

// Pipes the main-process refresh-backfill-status channel into the
// refresh-monitor store, seeding a one-shot snapshot on mount.
export function RefreshStatusBridge() {
  useEffect(() => {
    void window.pond
      .refreshBackfillStatusGet()
      .then((status) => refreshMonitor.ingest(status))
      .catch(() => {
        /* snapshot is best-effort; live pushes still update the store */
      });
    return window.pond.onRefreshBackfillStatus((status) => {
      refreshMonitor.ingest(status);
    });
  }, []);

  return null;
}
