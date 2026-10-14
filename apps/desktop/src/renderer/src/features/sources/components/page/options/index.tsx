import {
  LOCKED_SOURCE_COLUMN,
  SOURCE_COLUMN_CATALOG,
  sourcesColumnsLayout,
  useSourcesColumnLayout,
} from "@/features/sources/state/sources-columns";
import { TableOptionsMenu } from "@/shared/components/table-options";

export function SourceOptionsMenu() {
  const layout = useSourcesColumnLayout();
  return (
    <TableOptionsMenu
      columns={SOURCE_COLUMN_CATALOG}
      lockedId={LOCKED_SOURCE_COLUMN}
      layout={layout}
      onHiddenChange={sourcesColumnsLayout.setHidden}
      onSortChange={sourcesColumnsLayout.setSort}
    />
  );
}
