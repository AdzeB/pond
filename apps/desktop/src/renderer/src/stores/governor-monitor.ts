import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { GovernorSnapshotWire } from "../../../preload";

export type GovernorSnapshot = GovernorSnapshotWire;

const INITIAL: GovernorSnapshot = {
  allPaused: false,
  paused: [],
  atRisk: [],
};

const store = new Store<GovernorSnapshot>(INITIAL);

export const governorMonitor = {
  ingest(snapshot: GovernorSnapshot): void {
    store.setState(() => snapshot);
  },
};

export function useGovernorSnapshot(): GovernorSnapshot {
  return useSelector(store, (s) => s);
}
