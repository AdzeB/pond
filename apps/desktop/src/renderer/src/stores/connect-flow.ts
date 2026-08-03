import type { Source } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { type DockMode, dockMode } from "@/stores/dock-mode";

/**
 * The in-flight "connect a source" hand-off: the tray card picks the platform, the sources page owns the sign-in wait.
 * @remarks Lives in a store because the picker (dock tray) and the waiting dialog (sources page) are separate trees.
 */
interface ConnectFlowState {
  /** Platform shown on the wait card; kept through clear so exit frames stay source-specific. */
  source: Source | null;
  /** Platform sent to the browser for sign-in; polled until an account for it connects. */
  waiting: Source | null;
  /** Snapshot of connected account ids when connect started, so a fresh or re-authed account is distinguishable from already-healthy ones. */
  connectedBefore: ReadonlySet<string>;
  /** The account arrived; the wait card ticks its remaining steps before the flow moves on. */
  completed: boolean;
}

const store = new Store<ConnectFlowState>({
  source: null,
  waiting: null,
  connectedBefore: new Set<string>(),
  completed: false,
});

export const connectFlow = {
  start(source: Source, connectedIds: Iterable<string>): void {
    void window.pond.connectSource(source);
    store.setState(() => ({
      source,
      waiting: source,
      connectedBefore: new Set(connectedIds),
      completed: false,
    }));
  },
  complete(): void {
    store.setState((s) => (s.completed ? s : { ...s, completed: true }));
  },
  clear(): void {
    const waiting = store.state.waiting;
    store.setState((s) => (s.waiting === null ? s : { ...s, waiting: null }));
    if (waiting) void window.pond.clearPendingSession(waiting);
  },
};

/**
 * Cancel only when leaving the wait card.
 * @remarks TanStack Store subscribe effects track every atom read in the callback. Reading connect-flow inside a dockMode listener re-fires that listener on start() and clears the pending session while the picker is still open.
 */
let previousMode: DockMode | null = null;
dockMode.subscribe((mode) => {
  const from = previousMode;
  const leftWait = from === "connect-wait" && mode !== "connect-wait";
  previousMode = mode;
  if (leftWait) queueMicrotask(() => connectFlow.clear());
});

export function useConnectSource(): Source | null {
  return useSelector(store, (s) => s.source);
}

export function useConnectWaiting(): Source | null {
  return useSelector(store, (s) => s.waiting);
}

export function useConnectedBefore(): ReadonlySet<string> {
  return useSelector(store, (s) => s.connectedBefore);
}

export function useConnectCompleted(): boolean {
  return useSelector(store, (s) => s.completed);
}
