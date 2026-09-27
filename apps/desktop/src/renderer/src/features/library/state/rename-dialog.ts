import { Store } from "@tanstack/store";

interface RenameDialogState {
  id: string;
  ids: readonly string[];
}

export const renameDialogStore = new Store<RenameDialogState | null>(null);

export function openRenameDialog(ids: readonly string[]): void {
  if (ids.length === 0) return;
  renameDialogStore.setState(() => ({
    id: crypto.randomUUID(),
    ids: [...new Set(ids)],
  }));
}

export function closeRenameDialog(): void {
  renameDialogStore.setState(() => null);
}
