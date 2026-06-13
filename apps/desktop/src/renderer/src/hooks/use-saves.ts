import { useStore } from "@tanstack/react-store";
import { bootStore } from "@/lib/bootstrap";
import type { Save } from "@/lib/types";
import { savesStore } from "@/stores/pool";

export function useSave(id: string | null | undefined): Save | undefined {
  return useStore(savesStore, (s) => (id ? s.byId.get(id) : undefined));
}

export function useSaves(): ReadonlyArray<Save> {
  return useStore(savesStore, (s) => s.sorted);
}

export function useBootReady(): boolean {
  return useStore(bootStore, (s) => s.ready);
}
