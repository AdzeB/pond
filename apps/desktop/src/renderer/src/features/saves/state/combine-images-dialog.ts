import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface CombineImagesDialogState {
  id: string;
  ids: string[];
  folderId: string | null;
}

const store = new Store<CombineImagesDialogState | null>(null);

export function openCombineImagesDialog(
  ids: readonly string[],
  folderId: string | null,
): void {
  store.setState(() => ({
    id: crypto.randomUUID(),
    ids: [...ids],
    folderId,
  }));
}

export function closeCombineImagesDialog(): void {
  store.setState(() => null);
}

export function useCombineImagesDialog(): CombineImagesDialogState | null {
  return useSelector(store, (state) => state);
}
