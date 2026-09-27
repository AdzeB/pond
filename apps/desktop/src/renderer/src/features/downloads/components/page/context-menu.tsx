import {
  IconCircleXmarkFill18,
  IconMediaPauseFill18,
  IconRefreshFill18,
} from "@pond/icons/fill/18";
import {
  IconBanOutline18,
  IconTrashXmarkOutline18,
} from "@pond/icons/outline/18";
import { type MenuItemSpec, useDataTable } from "@pond/ui";
import type { ReactElement } from "react";
import {
  canCancelDownload,
  canSkipDownload,
  canTrashDownload,
  confirmCancelDownloadRows,
  confirmSkipDownloadRows,
  confirmTrashDownloadRows,
  retryDownloadRows,
} from "@/features/downloads/components/lib/actions";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import type { DownloadViewRow } from "./columns";

function menuTargets(row: DownloadRow): readonly DownloadRow[] {
  const selected = downloadsSelection.snapshot();
  return selected.some((item) => item.id === row.id) ? selected : [row];
}

export function buildDownloadMenuItems(
  rows: readonly DownloadRow[],
): MenuItemSpec[] {
  const plural = rows.length > 1;
  const retryable = rows.some((row) => row.status === "failed");
  const cancellable = rows.some(canCancelDownload);
  const skippable = rows.some(canSkipDownload);
  const trashable = rows.some(canTrashDownload);
  return [
    {
      label: plural ? "Retry Selected" : "Retry Download",
      icon: <IconRefreshFill18 />,
      disabled: !retryable,
      onClick: () =>
        void retryDownloadRows(rows).then((did) => {
          if (did) downloadsSelection.clear();
        }),
    },
    {
      label: plural ? "Cancel Selected" : "Cancel Download",
      icon: <IconMediaPauseFill18 />,
      disabled: !cancellable,
      onClick: () => confirmCancelDownloadRows(rows),
    },
    {
      label: plural ? "Skip Selected" : "Skip Download",
      icon: <IconBanOutline18 />,
      disabled: !skippable,
      onClick: () => confirmSkipDownloadRows(rows),
    },
    { type: "separator" },
    {
      label: plural ? "Move Selected to Trash" : "Move to Trash",
      icon: <IconTrashXmarkOutline18 />,
      variant: "destructive",
      disabled: !trashable,
      onClick: () => confirmTrashDownloadRows(rows),
    },
    { type: "separator" },
    {
      label: "Clear Selection",
      icon: <IconCircleXmarkFill18 />,
      onClick: downloadsSelection.clear,
    },
  ];
}

export function DownloadContextMenu({
  row,
  children,
}: {
  row: DownloadViewRow;
  children: ReactElement;
}) {
  const { actions, selectionStore } = useDataTable<DownloadViewRow>();
  return (
    <SpecContextMenu
      onOpen={() => {
        if (selectionStore.state.selectedIds.has(row.id)) return;
        actions.replaceSelection([row.id]);
        downloadsSelection.set([row]);
      }}
      buildItems={() => buildDownloadMenuItems(menuTargets(row))}
    >
      {children}
    </SpecContextMenu>
  );
}
