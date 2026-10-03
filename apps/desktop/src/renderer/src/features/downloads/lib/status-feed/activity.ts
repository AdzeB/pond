import { Store } from "@tanstack/store";

type ActivityState = "running" | "done" | "error";

export interface ActivityEntry {
  readonly id: number;
  readonly label: string;
  readonly state: ActivityState;
  readonly message?: string;
  readonly startedAt: number;
  readonly endedAt?: number;
}

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

export const statusFeed = {
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
  dismiss(id: number): void {
    store.setState((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
    }));
  },
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
