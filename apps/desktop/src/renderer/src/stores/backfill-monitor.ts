import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

type BackfillState = "idle" | "running" | "done" | "error";

// Live wire shape pushed over onScreenshotBackfillStatus; mirrors the main process type.
interface BackfillStatus {
  state: BackfillState;
  attempted: number;
  captured: number;
  total: number;
  message?: string;
  lastError?: string | null;
}

const INITIAL: BackfillStatus = {
  state: "idle",
  attempted: 0,
  captured: 0,
  total: 0,
};

const store = new Store<BackfillStatus>(INITIAL);

export const backfillMonitor = {
  ingest(status: BackfillStatus): void {
    store.setState(() => status);
  },
};

export function useBackfillStatus(): BackfillStatus {
  return useSelector(store, (s) => s);
}
