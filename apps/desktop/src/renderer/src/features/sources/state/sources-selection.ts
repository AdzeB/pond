import type { SourceTableRow } from "@/features/sources/components/page/lib/helpers";
import { createRowSelectionStore } from "../../../shared/state/row-selection";

export const sourcesSelection = createRowSelectionStore<SourceTableRow>(
  (a, b) =>
    a.id === b.id &&
    a.model.tone === b.model.tone &&
    a.model.connected === b.model.connected,
);
