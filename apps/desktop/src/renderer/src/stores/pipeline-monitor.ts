import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { PipelineSnapshotWire } from "../../../preload";

export type PipelineSnapshot = PipelineSnapshotWire;

const INITIAL: PipelineSnapshot = {
  paused: false,
  inflight: 0,
  inflightByOp: {},
  pending: 0,
  ingesting: 0,
};

const store = new Store<PipelineSnapshot>(INITIAL);

export const pipelineMonitor = {
  ingest(snapshot: PipelineSnapshot): void {
    store.setState(() => snapshot);
  },
};

export function usePipelineSnapshot(): PipelineSnapshot {
  return useSelector(store, (s) => s);
}
