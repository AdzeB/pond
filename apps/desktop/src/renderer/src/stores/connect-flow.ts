import type { Source } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { dockMode } from "@/stores/dock-mode";

/**
 * The in-flight "connect a source" hand-off: the tray card picks the platform, the sources page owns the sign-in wait.
 * @remarks Lives in a store because the picker (dock tray) and the waiting dialog (sources page) are separate trees.
 */
interface ConnectFlowState {
  /** Platform sent to the browser for sign-in; polled until an account for it connects. */
  waiting: Source | null;
  /** Snapshot of connected account ids when connect started, so a fresh or re-authed account is distinguishable from already-healthy ones. */
  connectedBefore: ReadonlySet<string>;
}

const store = new Store<ConnectFlowState>({
  waiting: null,
  connectedBefore: new Set<string>(),
});

export const connectFlow = {
  start(source: Source, connectedIds: Iterable<string>): void {
    void window.pond.connectSource(source);
    store.setState(() => ({
      waiting: source,
      connectedBefore: new Set(connectedIds),
    }));
  },
  clear(): void {
    store.setState((s) => (s.waiting === null ? s : { ...s, waiting: null }));
  },
};

/** The wait lives in the tray's connect-wait card; leaving that card for any reason cancels the wait, matching the old dialog's close-to-cancel. */
dockMode.subscribe((mode) => {
  if (mode !== "connect-wait") connectFlow.clear();
});

export function useConnectWaiting(): Source | null {
  return useSelector(store, (s) => s.waiting);
}

export function useConnectedBefore(): ReadonlySet<string> {
  return useSelector(store, (s) => s.connectedBefore);
}
