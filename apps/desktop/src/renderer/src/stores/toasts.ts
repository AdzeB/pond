import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type ToastTone = "info" | "success" | "error";

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

interface ToastState {
  readonly items: readonly Toast[];
}

const store = new Store<ToastState>({ items: [] });

let nextId = 1;
const DEFAULT_MS = 4000;

// Show a transient toast. Returns its id so callers can dismiss early. A non-
// positive `ms` keeps the toast until dismissed manually.
export function pushToast(
  message: string,
  tone: ToastTone = "info",
  ms = DEFAULT_MS,
): number {
  const id = nextId++;
  store.setState((s) => ({ items: [...s.items, { id, message, tone }] }));
  if (ms > 0) setTimeout(() => dismissToast(id), ms);
  return id;
}

export function dismissToast(id: number): void {
  store.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));
}

export function useToasts(): readonly Toast[] {
  return useSelector(store, (s) => s.items);
}
