import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";

// Mirrors the main-process StorageGuardStatusWire pushed over onStorageStatus.
export interface StorageStatus {
  state: "ok" | "warn" | "exceeded";
  pondBytes: number;
  capBytes: number | null;
  warnBytes: number | null;
  action: "warn" | "pauseSync" | "pauseVideo";
  appliedAt: string;
}

interface StorageState {
  value: StorageStatus | null;
}

const store = new Store<StorageState>({ value: null });

let subscribed = false;

// Lazily attach the single live listener the first time a component subscribes.
function ensureSubscription(): void {
  if (subscribed) return;
  subscribed = true;
  window.pond.onStorageStatus((status) => {
    store.setState(() => ({ value: status }));
  });
}

export function useStorageStatus(): StorageStatus | null {
  useEffect(() => {
    ensureSubscription();
  }, []);
  return useSelector(store, (s) => s.value);
}
