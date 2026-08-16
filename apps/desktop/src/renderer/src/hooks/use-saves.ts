import { useSelector } from "@tanstack/react-store";
import type { Save } from "@/lib/types";
import { pagingStore } from "@/stores/bootstrap";
import { savesStore } from "@/stores/pool";

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
