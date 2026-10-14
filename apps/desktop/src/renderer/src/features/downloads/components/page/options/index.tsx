import { TableOptionsMenu } from "@/shared/components/table-options";
import {
  DOWNLOAD_COLUMN_CATALOG,
  LOCKED_DOWNLOAD_COLUMN,
} from "../../../lib/download-columns";
import {
  downloadsColumnsLayout,
  useDownloadsColumnLayout,
} from "../../../state/downloads-columns";

export function DownloadOptionsMenu() {
  const layout = useDownloadsColumnLayout();
  return (
    <TableOptionsMenu
      columns={DOWNLOAD_COLUMN_CATALOG}
      lockedId={LOCKED_DOWNLOAD_COLUMN}
      layout={layout}
      onHiddenChange={downloadsColumnsLayout.setHidden}
      onSortChange={downloadsColumnsLayout.setSort}
    />
  );
}
