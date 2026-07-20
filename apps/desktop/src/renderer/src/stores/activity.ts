import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type ActivityState = "running" | "done" | "error";

export interface ActivityEntry {
  readonly id: number;
  readonly label: string;
  readonly state: ActivityState;
  /** Failure detail or completion summary, shown in Settings. */
  readonly message?: string;
  readonly startedAt: number;
  readonly endedAt?: number;
}

/** Old entries only matter as a recent record; the queue view in Settings covers real history. */
const MAX_ENTRIES = 30;

const store = new Store<{ entries: readonly ActivityEntry[] }>({
  entries: [],
});
let nextId = 1;

function insert(entry: ActivityEntry): void {
  store.setState((s) => ({
    entries: [entry, ...s.entries].slice(0, MAX_ENTRIES),
  }));
}

function patch(id: number, changes: Partial<ActivityEntry>): void {
  store.setState((s) => ({
    entries: s.entries.map((e) => (e.id === id ? { ...e, ...changes } : e)),
  }));
}

/** Background-work log; running entries drive the dock pill, settled ones the record in Settings. */
export const activity = {
  start(label: string): number {
    const id = nextId++;
    insert({ id, label, state: "running", startedAt: Date.now() });
    return id;
  },
  done(id: number, message?: string): void {
    patch(id, { state: "done", message, endedAt: Date.now() });
  },
  fail(id: number, message: string): void {
    patch(id, { state: "error", message, endedAt: Date.now() });
  },
  /** For work canceled before it did anything, so the record doesn't log a non-event. */
  dismiss(id: number): void {
    store.setState((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
    }));
  },
  /** One-shot failure for work that dies before it has a running phase. */
  error(label: string, message: string): void {
    const now = Date.now();
    insert({
      id: nextId++,
      label,
      state: "error",
      message,
      startedAt: now,
      endedAt: now,
    });
  },
  /** One-shot record for fire-and-forget work whose completion isn't observable. */
  note(label: string, message?: string): void {
    const now = Date.now();
    insert({
      id: nextId++,
      label,
      state: "done",
      message,
      startedAt: now,
      endedAt: now,
    });
  },
};

export function useActivityEntries(): readonly ActivityEntry[] {
  return useSelector(store, (s) => s.entries);
}
