import type { Ref } from "react";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
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
  variant?: "row" | "card";
}) {
  return (
    <TagRowProvider row={row}>
      <ItemRow variant={variant} />
    </TagRowProvider>
  );
}

function ItemRow({ variant }: { variant: "row" | "card" }) {
  const { row, rowRef, buildMenuItems } = useTagRow();
  if (row.kind !== "tag") return null;

  return (
    <SpecContextMenu buildItems={buildMenuItems}>
      <div
        ref={rowRef as Ref<HTMLDivElement>}
        className={styles.row}
        data-tag-row=""
        data-card={variant === "card" || undefined}
        tabIndex={-1}
        title={row.tag.name}
      >
        <TagCheckbox rowId={row.id} name={row.tag.name} />
        <NameCell />
        <ActionsCell />
      </div>
    </SpecContextMenu>
  );
}
