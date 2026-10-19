import { IconArrowRotateClockwise, IconGrid } from "@pond/icons";
import { Button } from "@pond/ui";
import { viewAccountItems } from "@/features/library";
import { sourcesSelection } from "@/features/sources/state/sources-selection";
import { SelectionBar } from "@/shared/components/selection-bar";
import type { SourceTableRow } from "../lib/helpers";

function isRemote(row: SourceTableRow): boolean {
  return row.entry.kind !== "folder";
}

function canFetch(row: SourceTableRow): boolean {
  return isRemote(row) && row.model.connected && row.model.tone !== "run";
}

export function SourceSelectionBar() {
  const rows = sourcesSelection.useRows();
  const remote = rows.filter(isRemote);
  const fetchable = rows.filter(canFetch);
  return (
    <SelectionBar
      label="Selected Sources"
      count={rows.length}
      onClear={sourcesSelection.clear}
    >
      <Button
        size="sm"
        variant="secondary"
        disabled={remote.length === 0}
        onClick={() => viewAccountItems(remote.map((row) => row.id))}
      >
        <IconGrid />
        Show Saved Items
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={fetchable.length === 0}
        onClick={() => {
          for (const row of fetchable) void window.pond.syncRunNow(row.id);
        }}
      >
        <IconArrowRotateClockwise />
        Fetch New Saves
      </Button>
    </SelectionBar>
  );
}
