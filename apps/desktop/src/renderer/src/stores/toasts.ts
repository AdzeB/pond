import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type ToastTone = "info" | "success" | "error";

export interface ToastAction {
  readonly label: string;
  readonly onAction: () => void;
}

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
  readonly action?: ToastAction;
}

interface ToastState {
  readonly items: readonly Toast[];
}

const store = new Store<ToastState>({ items: [] });

let nextId = 1;
const DEFAULT_MS = 4000;

interface PushToastOptions {
  tone?: ToastTone;
  ms?: number;
  action?: ToastAction;
}

// Show a transient toast. Returns its id so callers can dismiss early. A non-
// positive `ms` keeps the toast until dismissed manually. Accepts either a tone
// shorthand (legacy callers) or an options object with an optional action.
export function pushToast(
  message: string,
  toneOrOptions: ToastTone | PushToastOptions = "info",
  ms = DEFAULT_MS,
): number {
  const opts: PushToastOptions =
    typeof toneOrOptions === "string"
      ? { tone: toneOrOptions, ms }
      : { ms, ...toneOrOptions };
  const tone = opts.tone ?? "info";
  const lifespan = opts.ms ?? DEFAULT_MS;
  const id = nextId++;
  store.setState((s) => ({
    items: [...s.items, { id, message, tone, action: opts.action }],
  }));
  if (lifespan > 0) setTimeout(() => dismissToast(id), lifespan);
  return id;
}

export function dismissToast(id: number): void {
  store.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));
}

export function useToasts(): readonly Toast[] {
  return useSelector(store, (s) => s.items);
}
