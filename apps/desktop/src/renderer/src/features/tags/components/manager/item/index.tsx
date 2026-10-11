import { useDataTable } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import { TagContextMenu } from "@/features/tags/components/context-menu";
import { ActionsCell, NameCell } from "../lib/cells";
import { TagRowProvider, useTagRow } from "../lib/row-context";
import { TagCheckbox } from "../lib/select";
import type { TagsRowData } from "../lib/types";
import styles from "./styles.module.css";

export function TagItem({
  row,
  variant = "row",
}: {
  row: Extract<TagsRowData, { kind: "tag" }>;
  variant?: "row" | "card" | "index";
}) {
  return (
    <TagRowProvider row={row}>
      <ItemRow variant={variant} />
    </TagRowProvider>
  );
}

function ItemRow({ variant }: { variant: "row" | "card" | "index" }) {
  const { row, rowRef, buildMenuItems } = useTagRow();
  const { selectionStore, actions } = useDataTable<TagsRowData>();
  const selected = useSelector(selectionStore, (state) =>
    state.selectedIds.has(row.id),
  );
  if (row.kind !== "tag") return null;

  return (
    <TagContextMenu buildItems={buildMenuItems}>
      <div
        ref={rowRef}
        className={styles.row}
        data-tag-row=""
        data-card={variant === "card" || undefined}
        data-index={variant === "index" || undefined}
        data-selected={selected || undefined}
        role="option"
        aria-selected={selected}
        tabIndex={variant === "index" ? 0 : -1}
        title={row.tag.name}
        onClick={(event) => {
          if (variant === "index" && event.shiftKey) {
            actions.toggleRow(row.id, true);
          }
        }}
        onKeyDown={(event) => {
          if (
            variant === "index" &&
            event.shiftKey &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            actions.toggleRow(row.id, true);
          }
        }}
      >
        {variant !== "index" ? (
          <TagCheckbox rowId={row.id} name={row.tag.name} />
        ) : null}
        <NameCell index={variant === "index"} />
        <ActionsCell />
      </div>
    </TagContextMenu>
  );
}
