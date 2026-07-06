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

// Count of saves still being ingested (queued/downloading) so the dock and grid can
// surface extension-driven work that the grid filter hides until it reaches "complete".
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
export function useBootReady(): boolean {
  return useSelector(bootStore, (s) => s.ready);
}
