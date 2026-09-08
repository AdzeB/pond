// biome-ignore-all lint/a11y/useSemanticElements: matches DataTable's ARIA grid structure.
// biome-ignore-all lint/a11y/useFocusableInteractive: each cell contains a keyboard-focusable control.
import {
  IconCheckOutline18,
  IconChevronRightOutline18,
  IconDownloadOutline18,
  IconMediaPauseOutline18,
  IconTriangleWarningOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import {
  Button,
  type RenderRowArgs,
  type TableColumn,
  Tooltip,
} from "@pond/ui";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import {
  type DownloadRow,
  statusFeed,
} from "@/features/downloads/lib/status-feed";
import { useMediaPickOptions } from "@/features/saves/hooks/use-media-pick-options";
import { useSave } from "@/features/saves/hooks/use-saves";
import { pickPrimaryUnit } from "@/features/saves/lib/media/units";
import { openSave } from "@/features/saves/lib/save-nav";
import { getSourceLabel } from "@/features/saves/lib/source-labels";
import { getSourceIcon, getSourceLogo } from "@/features/sources/lib/registry";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import { IconSwap } from "./icon-swap";
import styles from "./page.module.css";

export const downloadsColumns: TableColumn<DownloadRow>[] = [
  {
    id: "name",
    header: "Name",
    sortLabel: "Name",
    accessor: (row) => row.name,
    width: "minmax(220px, 1fr)",
    cell: () => null,
  },
  {
    id: "status",
    header: "Status",
    sortLabel: "Status",
    accessor: (row) => row.status,
    width: "180px",
    cell: () => null,
  },
  {
    id: "source",
    header: "Source",
    sortLabel: "Source",
    accessor: (row) => getSourceLabel(row.source),
    width: "120px",
    cell: () => null,
  },
  {
    id: "time",
    header: "Updated",
    sortLabel: "Updated",
    accessor: (row) => row.ts,
    sort: "number",
    width: "112px",
    cell: () => null,
  },
  { id: "actions", headerHidden: true, width: "40px", cell: () => null },
];

function DownloadThumbnail({ row }: { row: DownloadRow }) {
  const save = useSave(row.saveId);
  const options = useMediaPickOptions();
  const [failedUrl, setFailedUrl] = useState<string>();
  const unit = save ? pickPrimaryUnit(save, options) : null;
  const url = unit?.isVideo ? unit.posterUrl : unit?.url;
  const logo = getSourceLogo(row.source);
  const Icon = getSourceIcon(row.source) ?? IconDownloadOutline18;

  return (
    <span className={styles.thumbnail} aria-hidden="true">
      {url && url !== failedUrl ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(url)}
        />
      ) : logo ? (
        <img className={styles.logo} src={logo} alt="" />
      ) : (
        <Icon />
      )}
    </span>
  );
}

export function DownloadQueueRow({
  row,
  rowProps,
  paused,
}: RenderRowArgs<DownloadRow> & { paused: boolean }) {
  const descriptionId = useId();
  const running = row.status === "running";
  const waiting = row.status === "pending" || row.status === "blocked";
  const stopped = paused && waiting;
  const attention = row.status === "failed" || row.status === "blocked";
  const cancelled = row.status === "cancelled";
  const cancellable = row.live && (running || waiting);
  const processing =
    row.op === "ensure_poster" ||
    row.op === "render_text_cover" ||
    row.op === "finalize";
  const title = row.name.trim() || row.url.trim() || "Untitled save";
  const status = running
    ? (row.stage ?? "Downloading")
    : stopped
      ? "Paused"
      : row.status === "complete"
        ? "Saved to your library"
        : row.status === "failed"
          ? "Needs another try"
          : row.status === "blocked"
            ? "Waiting to retry"
            : cancelled
              ? "Cancelled"
              : "Waiting";
  const cancel = useMutation({
    mutationFn: () => window.pond.pipelineCancelSave(row.saveId),
    onError: () =>
      statusFeed.error(
        "Cancel download",
        "Couldn't cancel this download. Try again.",
      ),
  });

  return (
    <div
      {...rowProps}
      className={`${rowProps.className} ${styles.row}`}
      data-status={row.status}
      data-moving={running || undefined}
      data-processing={processing || undefined}
      data-paused={stopped || undefined}
    >
      <div role="gridcell" className={styles.content}>
        <button
          type="button"
          className={styles.open}
          aria-label={`Open ${title}`}
          aria-describedby={`${descriptionId} ${descriptionId}-status`}
        >
          <DownloadThumbnail row={row} />
          <span className={styles.copy} id={descriptionId}>
            <strong className={styles.title} title={title}>
              {title}
            </strong>
            {attention && row.error ? (
              <span className={styles.error} title={row.error}>
                {row.error}
              </span>
            ) : null}
          </span>
        </button>
      </div>
      <div role="gridcell" className={styles.status} title={status}>
        <span className={styles.activity} aria-hidden="true">
          {attention ? (
            <IconTriangleWarningOutline18 />
          ) : row.status === "complete" ? (
            <IconCheckOutline18 />
          ) : cancelled ? (
            <IconXmarkOutline18 />
          ) : stopped ? (
            <IconMediaPauseOutline18 />
          ) : (
            <IconDownloadOutline18 />
          )}
        </span>
        <span className={styles.stage} id={`${descriptionId}-status`}>
          {status}
        </span>
      </div>
      <div role="gridcell" className={styles.source}>
        <span className={styles.meta}>{getSourceLabel(row.source)}</span>
      </div>
      <div role="gridcell" className={styles.time}>
        {relativeTimeFromMs(row.ts)}
      </div>
      <div role="gridcell" className={styles.rowAction}>
        <Tooltip label={cancellable ? "Cancel Download" : "View Save"}>
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label={`${cancellable ? "Cancel" : "View"} ${title}`}
            disabled={cancel.isPending}
            onClick={(event) => {
              event.stopPropagation();
              if (cancellable) cancel.mutate();
              else openSave(row.saveId);
            }}
          >
            <IconSwap id={cancellable ? "cancel" : "view"}>
              {cancellable ? (
                <IconXmarkOutline18 />
              ) : (
                <IconChevronRightOutline18 />
              )}
            </IconSwap>
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
