import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { RefreshBackfillStatusWire } from "../../../preload";

export type RefreshBackfillStatus = RefreshBackfillStatusWire;

const INITIAL: RefreshBackfillStatus = {
  state: "idle",
  total: 0,
  current: 0,
  succeeded: 0,
  failed: 0,
  authRequired: [],
  startedAt: null,
  finishedAt: null,
};

const store = new Store<RefreshBackfillStatus>(INITIAL);

export const refreshMonitor = {
  ingest(status: RefreshBackfillStatus): void {
    store.setState(() => status);
  },
};

export function useRefreshBackfillStatus(): RefreshBackfillStatus {
  return useSelector(store, (s) => s);
}
