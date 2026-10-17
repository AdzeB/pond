import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { createRowSelectionStore } from "../../../shared/state/row-selection";

export const downloadsSelection = createRowSelectionStore<DownloadRow>(
  (a, b) => a.id === b.id && a.status === b.status && a.live === b.live,
);
