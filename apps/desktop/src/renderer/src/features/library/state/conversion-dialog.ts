import { Store } from "@tanstack/store";

interface ConversionDialogState {
  id: string;
  ids: readonly string[];
  fileIndex: number;
}
export const conversionDialogStore = new Store<ConversionDialogState | null>(
  null,
);
export function openConversionDialog(
  ids: readonly string[],
  fileIndex = 0,
): void {
  if (ids.length)
    conversionDialogStore.setState(() => ({
      id: crypto.randomUUID(),
      ids: [...new Set(ids)],
      fileIndex,
    }));
}
export function closeConversionDialog(): void {
  conversionDialogStore.setState(() => null);
}
