import { confirm } from "@/components/confirm-dialog";

/** Shared by the Library menu item and the trash hotkey so both confirm before purging. */
export function confirmEmptyTrash(): void {
  confirm({
    title: "Empty Trash?",
    description:
      "Every save in the trash is deleted forever. This cannot be undone.",
    confirmLabel: "Empty Trash",
    busyLabel: "Emptying…",
    onConfirm: async () => {
      await window.pond.query("saves.emptyTrash", {});
    },
  });
}
