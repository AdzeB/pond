import {
  IconBan,
  IconCircleXmarkFill,
  IconCopy,
  IconLink2,
  IconMediaPauseFill,
  IconRefreshFill,
  IconTrashXmark,
  IconWindowShare,
} from "@pond/icons";
import { type MenuItemSpec, useDataTable } from "@pond/ui";
import type { ReactElement } from "react";
import {
  canCancelDownload,
  cancelDownloadRows,
  canSkipDownload,
  canTrashDownload,
  retryDownloadRows,
  skipDownloadRows,
  trashDownloadRows,
} from "@/features/downloads/components/lib/actions";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { openSave } from "@/features/saves/navigation";
import { SpecContextMenu } from "@/shared/components/spec-context-menu";
import type { DownloadViewRow } from "./columns";

export function openDownloadSave(row: DownloadRow): void {
  if (row.status === "complete") openSave(row.saveId);
}

function copyText(text: string): void {
  void window.pond.query("clipboard.writeText", { text });
}

function menuTargets(row: DownloadRow): readonly DownloadRow[] {
  const selected = downloadsSelection.snapshot();
  return selected.some((item) => item.id === row.id) ? selected : [row];
}

export function buildDownloadMenuItems(
  rows: readonly DownloadRow[],
): MenuItemSpec[] {
  const plural = rows.length > 1;
  const single = plural ? undefined : rows[0];
  const url = single?.url.trim() ?? "";
  const error = single?.error?.trim() ?? "";
  const retryable = rows.some((row) => row.status === "failed");
  const cancellable = rows.some(canCancelDownload);
  const skippable = rows.some(canSkipDownload);
  const trashable = rows.some(canTrashDownload);
  return [
    {
      label: "Open Save",
      icon: <IconWindowShare />,
      hidden: single?.status !== "complete",
      onClick: () => {
        if (single) openDownloadSave(single);
      },
    },
    { type: "separator" },
    {
      label: plural ? "Retry Selected" : "Retry Download",
      icon: <IconRefreshFill />,
      disabled: !retryable,
      onClick: () =>
        void retryDownloadRows(rows).then((did) => {
          if (did) downloadsSelection.clear();
        }),
    },
    {
      label: plural ? "Cancel Selected" : "Cancel Download",
      icon: <IconMediaPauseFill />,
      disabled: !cancellable,
      onClick: () => cancelDownloadRows(rows),
    },
    {
      label: plural ? "Skip Selected" : "Skip Download",
      icon: <IconBan />,
      disabled: !skippable,
      onClick: () => skipDownloadRows(rows),
    },
    { type: "separator" },
    {
      label: "Copy Link",
      icon: <IconLink2 />,
      hidden: !url,
      onClick: () => copyText(url),
    },
    {
      label: "Copy Error",
      icon: <IconCopy />,
      hidden: !error,
      onClick: () => copyText(error),
    },
    { type: "separator" },
    {
      label: plural ? "Move Selected to Trash" : "Move to Trash",
      icon: <IconTrashXmark />,
      variant: "destructive",
      disabled: !trashable,
      onClick: () => trashDownloadRows(rows),
    },
    { type: "separator" },
    {
      label: "Clear Selection",
      icon: <IconCircleXmarkFill />,
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
