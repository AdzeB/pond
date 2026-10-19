import {
  IconBan,
  IconMediaPauseFill,
  IconRefreshFill,
  IconTrashXmark,
} from "@pond/icons";
import { Button } from "@pond/ui";
import { type ReactNode, useState } from "react";
import {
  canCancelDownload,
  cancelDownloadRows,
  canRetryDownload,
  canSkipDownload,
  canTrashDownload,
  retryDownloadRows,
  skipDownloadRows,
  trashDownloadRows,
} from "@/features/downloads/components/lib/actions";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { SelectionBar } from "@/shared/components/selection-bar";

type BulkActionId = "retry" | "cancel" | "skip" | "trash";

interface BulkAction {
  id: BulkActionId;
  label: string;
  icon: ReactNode;
  applies: (row: DownloadRow) => boolean;
  run: (rows: readonly DownloadRow[]) => Promise<boolean>;
}

const BULK_ACTIONS: readonly BulkAction[] = [
  {
    id: "retry",
    label: "Retry",
    icon: <IconRefreshFill />,
    applies: canRetryDownload,
    run: retryDownloadRows,
  },
  {
    id: "cancel",
    label: "Cancel",
    icon: <IconMediaPauseFill />,
    applies: canCancelDownload,
    run: cancelDownloadRows,
  },
  {
    id: "skip",
    label: "Skip",
    icon: <IconBan />,
    applies: canSkipDownload,
    run: skipDownloadRows,
  },
  {
    id: "trash",
    label: "Move to Trash",
    icon: <IconTrashXmark />,
    applies: canTrashDownload,
    run: (rows) => trashDownloadRows(rows),
  },
];

export function DownloadSelectionBar() {
  const rows = downloadsSelection.useRows();
  const [pending, setPending] = useState<BulkActionId | null>(null);
  const run = (action: BulkAction) => {
    setPending(action.id);
    void action.run(rows).finally(() => setPending(null));
  };
  return (
    <SelectionBar
      label="Selected Downloads"
      count={rows.length}
      onClear={downloadsSelection.clear}
    >
      {BULK_ACTIONS.map((action) => (
        <Button
          key={action.id}
          size="sm"
          variant="secondary"
          disabled={pending !== null || !rows.some(action.applies)}
          loading={pending === action.id}
          onClick={() => run(action)}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </SelectionBar>
  );
}
