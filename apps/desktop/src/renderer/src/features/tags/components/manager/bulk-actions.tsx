import { Button, DataTable, Dialog } from "@pond/ui";
import type { MutableRefObject } from "react";
import { tagOperations } from "@/features/tags/operations/tag-client";
import styles from "./manager.module.css";

function promptBulkMerge(names: string[], onDone: () => void) {
  const count = names.length;
  Dialog.prompt({
    title: `Merge ${count} ${count === 1 ? "tag" : "tags"}`,
    description:
      "Every save using the selected tags will be re-tagged with the target, and the originals removed.",
    confirmLabel: "Merge",
    placeholder: "Target tag name",
    onConfirm: (value) =>
      void tagOperations.mergeTags(names, value).then(onDone),
  });
}

function confirmBulkDelete(names: string[], onDone: () => void) {
  const count = names.length;
  Dialog.confirm({
    title: `Delete ${count} ${count === 1 ? "tag" : "tags"}`,
    description: "They will be removed from every save. This cannot be undone.",
    confirmLabel: "Delete",
    onConfirm: () => void tagOperations.deleteTags(names).then(onDone),
  });
}

export function TagsBulkActionBar({
  namesFromIds,
  clearRef,
}: {
  namesFromIds: (ids: string[]) => string[];
  clearRef: MutableRefObject<() => void>;
}) {
  return (
    <DataTable.ActionBar className={styles["action-bar"]}>
      {(selection) => {
        const names = namesFromIds(selection.ids);
        const count = names.length;
        return (
          <>
            <span className={styles["selection-count"]}>{count} selected</span>
            <DataTable.ActionBarDivider />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                clearRef.current = selection.clear;
                promptBulkMerge(names, () => clearRef.current());
              }}
            >
              Merge
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                clearRef.current = selection.clear;
                confirmBulkDelete(names, () => clearRef.current());
              }}
            >
              Delete
            </Button>
            <Button size="sm" variant="secondary" onClick={selection.clear}>
              Clear
            </Button>
          </>
        );
      }}
    </DataTable.ActionBar>
  );
}
