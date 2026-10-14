import type { MenuItemSpec } from "@pond/ui";
import {
  accountMenuTarget,
  buildSourceActionMenu,
  type SourceMenuOptions,
  watchMenuTarget,
} from "@/features/sources/lib/source-menu";
import { sourcesSelection } from "@/features/sources/state/sources-selection";
import type { SourceTableRow } from "./helpers";

export function contextMenuSources(clicked: SourceTableRow): SourceTableRow[] {
  const selected = sourcesSelection.snapshot();
  if (selected.some((row) => row.id === clicked.id) && selected.length > 1) {
    return [...selected];
  }
  return [clicked];
}

export function buildSourceMenu(
  rowOrRows: SourceTableRow | readonly SourceTableRow[],
  options: SourceMenuOptions = {},
): MenuItemSpec[] {
  const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  return buildSourceActionMenu(
    rows.flatMap((row) => {
      if (row.entry.kind === "account") {
        return [accountMenuTarget(row.entry.row, row.model)];
      }
      if (row.entry.kind === "watch") {
        return [watchMenuTarget(row.entry.row, row.model)];
      }
      return [];
    }),
    options,
  );
}
