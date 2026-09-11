import { Store } from "@tanstack/store";

interface ActionDialogState {
  id: string;
  ids: readonly string[];
  mode: "actions" | "rename";
}
export const actionDialogStore = new Store<ActionDialogState | null>(null);
export function openActionDialog(
  ids: readonly string[],
  mode: ActionDialogState["mode"] = "actions",
): void {
  if (ids.length)
    actionDialogStore.setState(() => ({
      id: crypto.randomUUID(),
      ids: [...new Set(ids)],
      mode,
    }));
}
export function closeActionDialog(): void {
  actionDialogStore.setState(() => null);
}
