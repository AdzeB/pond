import { Checkbox, useDataTable } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import type { MouseEvent } from "react";
import type { TagsRowData } from "./types";

function stop(e: MouseEvent) {
  e.stopPropagation();
}

export function TagCheckbox({ rowId, name }: { rowId: string; name: string }) {
  const { selectionStore, actions } = useDataTable<TagsRowData>();
  const selected = useSelector(selectionStore, (s) => s.selectedIds.has(rowId));
  return (
    <Checkbox.Root
      size="sm"
      checked={selected}
      aria-label={selected ? `Deselect ${name}` : `Select ${name}`}
      onClick={stop}
      onCheckedChange={() => actions.toggleRow(rowId, false)}
    >
      <Checkbox.Indicator />
    </Checkbox.Root>
  );
}
