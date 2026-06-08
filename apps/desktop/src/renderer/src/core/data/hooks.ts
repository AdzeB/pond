import { useStore } from "@tanstack/react-store";
import { bootStore } from "./bootstrap";
import { savesStore } from "./pool";
import type { Save } from "./types";

export function useSave(id: string | null | undefined): Save | undefined {
  return useStore(savesStore, (s) => (id ? s.byId.get(id) : undefined));
}

export function useSaves(): ReadonlyArray<Save> {
  return useStore(savesStore, (s) => s.sorted);
}

export function useBootReady(): boolean {
  return useStore(bootStore, (s) => s.ready);
}
