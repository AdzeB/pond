import { useEffect } from "react";
import { pipelineMonitor } from "@/stores/pipeline-monitor";

// Pipes the main-process pipeline-status channel into the pipeline-monitor
// store, seeding a one-shot snapshot on mount before live pushes arrive.
export function PipelineStatusBridge() {
  useEffect(() => {
    void window.pond
      .pipelineSnapshot()
      .then((snap) => {
        pipelineMonitor.ingest(snap);
      })
      .catch(() => {
        /* snapshot is best-effort; live pushes still update the store */
      });
    return window.pond.onPipelineStatus((snap) => {
      pipelineMonitor.ingest(snap);
    });
  }, []);

  return null;
}
