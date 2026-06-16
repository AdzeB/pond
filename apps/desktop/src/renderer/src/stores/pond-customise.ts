import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface PondCustomiseState {
  open: boolean;
  // `null` targets the active library.
  targetPath: string | null;
}

const store = new Store<PondCustomiseState>({ open: false, targetPath: null });

export const pondCustomise = {
  open(targetPath?: string | null): void {
    store.setState((s) => ({
      ...s,
      open: true,
      targetPath: targetPath ?? null,
    }));
  },
  close(): void {
    store.setState((s) => (s.open ? { ...s, open: false } : s));
  },
};

export function usePondCustomiseOpen(): boolean {
  return useSelector(store, (s) => s.open);
}

export function usePondCustomiseTarget(): string | null {
  return useSelector(store, (s) => s.targetPath);
}
