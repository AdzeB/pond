import { Store } from "@tanstack/store";
export const folderPickerStore = new Store<readonly string[]>([]);
export function openFolderPicker(ids: readonly string[]): void {
  folderPickerStore.setState(() => [...new Set(ids)]);
}
export function closeFolderPicker(): void {
  folderPickerStore.setState(() => []);
}
