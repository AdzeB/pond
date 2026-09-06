import { Dialog } from "@pond/ui";

export function confirmEmptyTrash(): void {
  Dialog.confirm({
    title: "Empty Trash",
    description:
      "Every save in the trash is deleted forever. This cannot be undone.",
    confirmLabel: "Empty Trash",
    busyLabel: "Emptying",
    onConfirm: async () => {
      await window.pond.query("saves.emptyTrash", {});
    },
  });
}
