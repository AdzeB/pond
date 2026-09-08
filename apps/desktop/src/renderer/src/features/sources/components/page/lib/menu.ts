import type { MenuItemSpec } from "@pond/ui";
import { viewAccountItems } from "@/features/search/lib/open-search";
import { sourcesSelection } from "@/features/sources/state/sources-selection";
import { buildAccountMenu } from "./account-menu";
import { type SourceTableRow, sourceCanSyncNow } from "./helpers";

export function contextMenuSources(clicked: SourceTableRow): SourceTableRow[] {
  const selected = sourcesSelection.snapshot();
  if (selected.some((row) => row.id === clicked.id) && selected.length > 1) {
    return [...selected];
  }
  return [clicked];
}

function syncLabel(rows: readonly SourceTableRow[]): string {
  return rows.every((row) => row.kind === "watch") ? "Check Now" : "Sync Now";
}

export function buildSourceMenu(
  rowOrRows: SourceTableRow | readonly SourceTableRow[],
): MenuItemSpec[] {
  const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  const row = rows[0];
  if (!row) return [];
  const batch = rows.length > 1;
  const ids = rows.map((item) => item.id);

  const items: MenuItemSpec[] = [
    {
      label: syncLabel(rows),
      disabled: !rows.some(sourceCanSyncNow),
      onClick: () => {
        for (const item of rows) {
          if (!sourceCanSyncNow(item)) continue;
          void window.pond.syncRunNow(item.id);
        }
      },
    },
    {
      label: "View Items in Library",
      onClick: () => viewAccountItems(ids),
    },
  ];

  if (!batch && row.entry.kind === "account") {
    items.push(
      { type: "separator" },
      ...buildAccountMenu(row.entry.row, row.model),
    );
  }

  return items;
}
