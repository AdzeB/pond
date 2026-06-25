import { useEffect } from "react";
import { governorMonitor } from "@/stores/governor-monitor";

// Pipes the main-process governor-status channel into the governor-monitor
// store, seeding a one-shot snapshot on mount.
export function GovernorStatusBridge() {
  useEffect(() => {
    void window.pond
      .governorSnapshot()
      .then((snap) => governorMonitor.ingest(snap))
      .catch(() => {
        /* snapshot is best-effort; live pushes still update the store */
      });
    return window.pond.onGovernorStatus((snap) => {
      governorMonitor.ingest(snap);
    });
  }, []);

  return null;
}
