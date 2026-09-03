import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { selection } from "@/stores/selection";

interface InspectState {
  grayscale: boolean;
  compare: boolean;
}

const store = new Store<InspectState>({
  grayscale: false,
  compare: false,
});

export const inspect = {
  toggleGrayscale(): void {
    store.setState((state) => ({ ...state, grayscale: !state.grayscale }));
  },
  setGrayscale(grayscale: boolean): void {
    store.setState((state) => ({ ...state, grayscale }));
  },
  setCompare(compare: boolean): void {
    store.setState((state) => ({ ...state, compare }));
  },
  toggleCompare(): void {
    store.setState((state) => ({ ...state, compare: !state.compare }));
  },
  pinCurrent(): void {
    const id = selection.getAnchor();
    if (!id) return;
    void window.pond.query("preview.pin", { id });
  },
};

export function useInspect(): InspectState {
  return useSelector(store, (state) => state);
}
