import type { Source } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { playUiSuccess } from "@/lib/ui/sounds";

/**
 * In-flight source connect: picker/detail start it, the wait card holds until the account arrives, sources page polls.
 */
interface ConnectFlowState {
  /** Platform shown in the wait card; kept through clear so exit frames stay source-specific. */
  source: Source | null;
  /** Platform sent for sign-in; polled until an account for it connects. */
  waiting: Source | null;
  /** Snapshot of connected account ids when connect started, so a fresh or re-authed account is distinguishable from already-healthy ones. */
  connectedBefore: ReadonlySet<string>;
  /** The account arrived; the wait card can show Connected before the flow moves on. */
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
    const already = store.state.completed;
    store.setState((s) => (s.completed ? s : { ...s, completed: true }));
    if (!already) playUiSuccess();
  },
  clear(): void {
    const waiting = store.state.waiting;
    store.setState((s) => (s.waiting === null ? s : { ...s, waiting: null }));
    if (waiting) void window.pond.clearPendingSession(waiting);
  },
};

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
