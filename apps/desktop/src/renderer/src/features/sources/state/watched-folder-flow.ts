import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const store = new Store({ revision: 0 });

export const watchedFolderFlow = {
  added(): void {
    store.setState((state) => ({ revision: state.revision + 1 }));
  },
  clear(): void {
    store.setState((state) => (state.revision === 0 ? state : { revision: 0 }));
  },
};

export function watchedFolderRevision(): number {
  return store.state.revision;
}

export function useWatchedFolderRevision(): number {
  return useSelector(store, (state) => state.revision);
}
