import { useSelector } from "@tanstack/react-store";
import type { Save } from "@/lib/types";
import { bootStore } from "@/stores/bootstrap";
import { savesStore } from "@/stores/pool";

export function useSave(id: string | null | undefined): Save | undefined {
  return useSelector(savesStore, (s) => (id ? s.byId.get(id) : undefined));
}

export function useSaves(): ReadonlyArray<Save> {
  return useSelector(savesStore, (s) => s.sorted);
}

// Count of saves still being ingested (queued/downloading) so the dock's saving
// pill can surface extension-driven work that the grid filter hides until it
// reaches "complete".
// Pass a lowercase `source` to scope the count (e.g. while viewing a single source).
export function useIngestingCount(source?: string): number {
  return useSelector(savesStore, (s) => {
    let count = 0;
    for (const save of s.byId.values()) {
      if (save.status !== "ingesting") continue;
      if (source && save.source.toLowerCase() !== source) continue;
      count += 1;
    }
    return count;
  });
}

// Summed per-save pipeline progress (done tasks / total tasks) across all
// ingesting saves. Combined with useIngestingCount this gives the saving pill
// a determinate overall progress without re-rendering on unrelated pool
// changes (the selector returns a primitive).
export function useIngestingProgressSum(): number {
  return useSelector(savesStore, (s) => {
    let sum = 0;
    for (const save of s.byId.values()) {
      if (save.status !== "ingesting") continue;
      const tasks = save.tasks ?? [];
      if (tasks.length === 0) continue;
      let done = 0;
      for (const t of tasks) if (t.status === "done") done += 1;
      sum += done / tasks.length;
    }
    return sum;
  });
}
export function useBootReady(): boolean {
  return useSelector(bootStore, (s) => s.ready);
}
