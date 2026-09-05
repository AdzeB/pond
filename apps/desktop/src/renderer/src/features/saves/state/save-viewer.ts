import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface SaveViewerState {
  fileIndex: number | null;
}

const store = new Store<SaveViewerState>({
  fileIndex: null,
});

export function setSaveViewerFileIndex(fileIndex: number | null): void {
  store.setState((s) => (s.fileIndex === fileIndex ? s : { ...s, fileIndex }));
}

export function useSaveViewerFileIndex(): number | null {
  return useSelector(store, (s) => s.fileIndex);
}
