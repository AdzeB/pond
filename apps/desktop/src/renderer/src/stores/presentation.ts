import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface PresentationState {
  readonly activeSaveId: string | null;
}

const store = new Store<PresentationState>({ activeSaveId: null });

export const presentation = {
  get(): string | null {
    return store.state.activeSaveId;
  },
  isOpen(): boolean {
    return store.state.activeSaveId !== null;
  },
  open(saveId: string): void {
    if (!saveId) return;
    store.setState((s) =>
      s.activeSaveId === saveId ? s : { activeSaveId: saveId },
    );
  },
  close(): void {
    store.setState((s) =>
      s.activeSaveId === null ? s : { activeSaveId: null },
    );
  },
  toggle(saveId: string): void {
    store.setState((s) => {
      if (s.activeSaveId === saveId) return { activeSaveId: null };
      if (saveId) return { activeSaveId: saveId };
      return s;
    });
  },
};

export function usePresentationId(): string | null {
  return useSelector(store, (s) => s.activeSaveId);
}
