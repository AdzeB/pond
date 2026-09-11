import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { resultNavigation } from "@/features/library/state/result-navigation";
import { selection } from "@/features/library/state/selection";

interface InspectState {
  grayscale: boolean;
  compare: boolean;
  showNavigator: boolean;
  commentRequest: number;
}

function readNavigator(): boolean {
  if (!globalThis.window) return false;
  try {
    return window.localStorage.getItem("pond.viewer.showNavigator") === "1";
  } catch {
    return false;
  }
}

const store = new Store<InspectState>({
  grayscale: false,
  compare: false,
  showNavigator: readNavigator(),
  commentRequest: 0,
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
  setShowNavigator(showNavigator: boolean): void {
    if (globalThis.window) {
      try {
        window.localStorage.setItem(
          "pond.viewer.showNavigator",
          showNavigator ? "1" : "0",
        );
      } catch {}
    }
    store.setState((state) =>
      state.showNavigator === showNavigator
        ? state
        : { ...state, showNavigator },
    );
  },
  toggleNavigator(): void {
    inspect.setShowNavigator(!store.state.showNavigator);
  },
  enterComment(): void {
    store.setState((state) => ({
      ...state,
      commentRequest: state.commentRequest + 1,
    }));
  },
  snapshot(): InspectState {
    return store.state;
  },
  pinCurrent(): void {
    const id = selection.getAnchor();
    if (!id) return;
    void window.pond.query("preview.pin", {
      id,
      navigation: resultNavigation.request() ?? undefined,
    });
  },
};

export function useInspect(): InspectState {
  return useSelector(store, (state) => state);
}
