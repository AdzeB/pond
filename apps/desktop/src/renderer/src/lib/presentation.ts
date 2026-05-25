import { useSyncExternalStore } from "react";

type Listener = () => void;

let activeSaveId: string | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export const presentation = {
  get(): string | null {
    return activeSaveId;
  },
  isOpen(): boolean {
    return activeSaveId !== null;
  },
  open(saveId: string): void {
    if (!saveId) return;
    if (activeSaveId === saveId) return;
    activeSaveId = saveId;
    notify();
  },
  close(): void {
    if (activeSaveId === null) return;
    activeSaveId = null;
    notify();
  },
  toggle(saveId: string): void {
    if (activeSaveId === saveId) {
      activeSaveId = null;
    } else if (saveId) {
      activeSaveId = saveId;
    }
    notify();
  },
  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

export function usePresentationId(): string | null {
  return useSyncExternalStore(
    presentation.subscribe,
    presentation.get,
    presentation.get,
  );
}
