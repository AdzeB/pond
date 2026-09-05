import { useSelector } from "@tanstack/react-store";
import { pagingStore } from "@/features/saves/state/bootstrap";
import { savesStore } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";

export function useSave(id: string | null | undefined): Save | undefined {
  return useSelector(savesStore, (s) => (id ? s.byId.get(id) : undefined));
}

export function useSaves(): ReadonlyArray<Save> {
  return useSelector(savesStore, (s) => s.sorted);
}

export function useBootReady(): boolean {
  return useSelector(pagingStore, (s) => s.ready);
}

export function useSavePaging() {
  return useSelector(pagingStore, (s) => ({
    hasMore: s.hasMore,
    loading: s.loading,
    loaded: s.loaded,
    total: s.total,
  }));
}
