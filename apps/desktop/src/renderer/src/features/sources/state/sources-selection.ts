import type { SourceTableRow } from "@/features/sources/components/page/lib/helpers";
import {
  createRowSelectionStore,
  type RowSelectionStore,
} from "../../../shared/state/row-selection";

const created = createRowSelectionStore<SourceTableRow>(
  (a, b) =>
    a.id === b.id &&
    a.model.tone === b.model.tone &&
    a.model.connected === b.model.connected,
);

export const sourcesSelection: RowSelectionStore<SourceTableRow> = created;
