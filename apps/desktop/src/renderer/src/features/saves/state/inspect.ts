import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface InspectState {
  grayscale: boolean;
  compare: boolean;
  showNavigator: boolean;
  commentRequest: {
    commentId: string | null;
    fileIndex: number;
    revision: number;
    saveId: string;
  } | null;
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
  commentRequest: null,
});

function requestComment(
  saveId: string,
  fileIndex: number,
  commentId: string | null,
): void {
  store.setState((state) => ({
    ...state,
    commentRequest: {
      commentId,
      fileIndex,
      revision: (state.commentRequest?.revision ?? 0) + 1,
      saveId,
    },
  }));
}

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
  enterComment(saveId: string, fileIndex: number): void {
    requestComment(saveId, fileIndex, null);
  },
  openComment(saveId: string, fileIndex: number, commentId: string): void {
    requestComment(saveId, fileIndex, commentId);
  },
  snapshot(): InspectState {
    return store.state;
  },
};

export function useInspect(): InspectState {
  return useSelector(store, (state) => state);
}
