// biome-ignore-all lint/a11y/useSemanticElements: matches DataTable's ARIA grid structure.
// biome-ignore-all lint/a11y/useFocusableInteractive: each cell contains a keyboard-focusable control.
import { IconMediaPauseFill18 } from "@pond/icons/fill/18";
import {
  IconCheckOutline18,
  IconChevronRightOutline18,
  IconDownloadOutline18,
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
import { Children, useId, useState } from "react";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import { useSave } from "@/hooks/use-saves";
import { pickPrimaryUnit } from "@/lib/media/units";
import { getSourceLabel } from "@/lib/save/source-labels";
import { getSourceIcon, getSourceLogo } from "@/lib/save/sources-registry";
import { type DownloadRow, statusFeed } from "@/lib/status-feed";
import { openSave } from "@/lib/ui/save-nav";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import styles from "./styles.module.css";

export const downloadsColumns: TableColumn<DownloadRow>[] = [
  { id: "time", accessor: (row) => row.ts, cell: () => null },
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
  cells,
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
      className={styles.row}
      style={undefined}
      data-status={row.status}
      data-moving={running || undefined}
      data-processing={processing || undefined}
      data-paused={stopped || undefined}
    >
      <div className={styles.rail}>
        <div className={styles.selection}>{Children.toArray(cells)[0]}</div>
        <span className={styles.activity} aria-hidden="true">
          {attention ? (
            <IconTriangleWarningOutline18 />
          ) : row.status === "complete" ? (
            <IconCheckOutline18 />
          ) : cancelled ? (
            <IconXmarkOutline18 />
          ) : stopped ? (
            <IconMediaPauseFill18 />
          ) : (
            <IconDownloadOutline18 />
          )}
          {cancellable ? (
            <span className={styles.pixels}>
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : null}
        </span>
      </div>
      <div role="gridcell" className={styles.content}>
        <button
          type="button"
          className={styles.open}
          aria-label={`Open ${title}`}
          aria-describedby={descriptionId}
        >
          <DownloadThumbnail row={row} />
          <span className={styles.copy} id={descriptionId}>
            <strong className={styles.title} title={title}>
              {title}
            </strong>
            <span className={styles.meta}>
              <span className={styles.source}>
                {getSourceLabel(row.source)}
              </span>
              <span aria-hidden="true">·</span>
              <span className={styles.stage}>{status}</span>
              {row.status === "complete" ? (
                <span className={styles.time}>
                  · {relativeTimeFromMs(row.ts)}
                </span>
              ) : null}
            </span>
            {attention && row.error ? (
              <span className={styles.error} title={row.error}>
                {row.error}
              </span>
            ) : null}
          </span>
        </button>
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
            {cancellable ? (
              <IconXmarkOutline18 />
            ) : (
              <IconChevronRightOutline18 />
            )}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
