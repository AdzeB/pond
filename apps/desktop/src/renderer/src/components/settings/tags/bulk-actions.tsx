import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, DataTable } from "@pond/ui";
import type { MutableRefObject } from "react";
import { confirm } from "@/components/shared/confirm-dialog";
import { prompt } from "@/components/shared/prompt-dialog";
import styles from "./styles.module.css";

async function bulkDelete(names: string[]) {
  for (const name of names) await window.pond.query("tags.delete", { name });
}

async function bulkMerge(names: string[], raw: string) {
  const target = normalizeLabelName(raw);
  if (!target) return;
  for (const name of names) {
    if (name.toLowerCase() === target.toLowerCase()) continue;
    await window.pond.query("tags.merge", { from: name, to: target });
  }
}

function promptBulkMerge(names: string[], onDone: () => void) {
  const count = names.length;
  prompt({
    title: `Merge ${count} ${count === 1 ? "tag" : "tags"}`,
    description:
      "Every save using the selected tags will be re-tagged with the target, and the originals removed.",
    confirmLabel: "Merge",
    placeholder: "Target tag name",
    onConfirm: (value) => void bulkMerge(names, value).then(onDone),
  });
}

function confirmBulkDelete(names: string[], onDone: () => void) {
  const count = names.length;
  confirm({
    title: `Delete ${count} ${count === 1 ? "tag" : "tags"}`,
    description: "They will be removed from every save. This cannot be undone.",
    confirmLabel: "Delete",
    onConfirm: () => void bulkDelete(names).then(onDone),
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
