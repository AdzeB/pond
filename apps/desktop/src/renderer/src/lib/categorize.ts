import { useSyncExternalStore } from "react";

type Listener = () => void;

interface CategorizeState {
  open: boolean;
  ids: ReadonlyArray<string>;
}

const CLOSED: CategorizeState = { open: false, ids: [] };

let state: CategorizeState = CLOSED;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export const categorize = {
  get(): CategorizeState {
    return state;
  },
  open(ids: ReadonlyArray<string>): void {
    if (ids.length === 0) return;
    state = { open: true, ids: [...ids] };
    notify();
  },
  close(): void {
    if (!state.open) return;
    state = CLOSED;
    notify();
  },
  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

export function useCategorize(): CategorizeState {
  return useSyncExternalStore(
    categorize.subscribe,
    categorize.get,
    categorize.get,
  );
}
