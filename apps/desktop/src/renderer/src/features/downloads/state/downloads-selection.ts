import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import {
  createRowSelectionStore,
  type RowSelectionStore,
} from "../../../shared/state/row-selection";

const created = createRowSelectionStore<DownloadRow>(
  (a, b) => a.id === b.id && a.status === b.status && a.live === b.live,
);

export const downloadsSelection: RowSelectionStore<DownloadRow> = created;
export function useDownloadsSelectionSize(): number {
  return created.useSize();
}
export function useDownloadsSelectionRows(): readonly DownloadRow[] {
  return created.useRows();
}
