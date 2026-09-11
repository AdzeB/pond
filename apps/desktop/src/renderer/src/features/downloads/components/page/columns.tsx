// biome-ignore-all lint/a11y/useSemanticElements: matches DataTable's ARIA grid structure.
// biome-ignore-all lint/a11y/useFocusableInteractive: each cell contains a keyboard-focusable control.
import {
  IconChevronRightOutline12,
  IconXmarkOutline12,
} from "@pond/icons/outline/12";
import { IconDownloadOutline18 } from "@pond/icons/outline/18";
import {
  Button,
  type RenderRowArgs,
  type TableColumn,
  Tooltip,
} from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
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
import { getSourceIcon, getSourceLogo } from "@/features/sources/lib/registry";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import {
  describeDownloadActivity,
  formatDuration,
} from "../../lib/download-progress";
import { IconSwap } from "./icon-swap";
import styles from "./page.module.css";
import {
  downloadStatusIcon,
  downloadStatusLabel,
  isDownloadAttention,
  isDownloadProcessing,
  isDownloadStopped,
  isDownloadWaiting,
} from "./status";

export const downloadsColumns: TableColumn<DownloadRow>[] = [
  {
    id: "name",
    header: "Name",
    sortLabel: "Name",
    accessor: (row) => row.name,
    width: "minmax(160px, 1fr)",
    cell: () => null,
  },
  {
    id: "status",
    header: "Now",
    sortLabel: "Status",
    accessor: (row) => row.status,
    width: "140px",
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
  const Icon = getSourceIcon(row.source);
  const logo = getSourceLogo(row.source);

  return (
    <span className={styles.thumbnail} aria-hidden="true">
      {url && url !== failedUrl ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(url)}
        />
      ) : Icon ? (
        <Icon />
      ) : logo ? (
        <img className={styles.logo} src={logo} alt="" />
      ) : (
        <IconDownloadOutline18 />
      )}
    </span>
  );
}

export function DownloadQueueRow({
  row,
  rowProps,
  paused,
  activity,
  now = Date.now(),
  inspected = false,
}: RenderRowArgs<DownloadRow> & {
  paused: boolean;
  activity?: DownloadActivity;
  now?: number;
  inspected?: boolean;
}) {
  const descriptionId = useId();
  const running = row.status === "running";
  const waiting = isDownloadWaiting(row);
  const stopped = isDownloadStopped(row, paused);
  const attention = isDownloadAttention(row);
  const cancellable = row.live && (running || waiting);
  const processing = isDownloadProcessing(row);
  const title = row.name.trim() || row.url.trim() || "Untitled save";
  const measured =
    running && activity?.state === "running"
      ? describeDownloadActivity(activity, now)
      : null;
  const status = measured?.label ?? downloadStatusLabel(row, paused);
  const elapsed =
    running && activity ? formatDuration(now - activity.phaseStartedAt) : null;
  const StatusIcon = downloadStatusIcon(row, paused);
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
      data-inspected={inspected || undefined}
      data-stalled={measured?.stalled || undefined}
      data-moving={running || undefined}
      data-processing={processing || undefined}
      data-paused={stopped || undefined}
    >
      <div role="gridcell" className={styles.content}>
        <button
          type="button"
          className={styles.open}
          aria-label={`Inspect ${title}`}
          aria-describedby={`${descriptionId} ${descriptionId}-status`}
        >
          <DownloadThumbnail row={row} />
          <span className={styles.copy} id={descriptionId}>
            <strong className={styles.title} title={title}>
              {title}
            </strong>
            <span className={styles.rowStatus} id={`${descriptionId}-status`}>
              <span className={styles.activity} aria-hidden="true">
                <StatusIcon />
              </span>
              <span
                className={attention && row.error ? styles.error : styles.stage}
                title={row.error ?? undefined}
              >
                {attention && row.error ? row.error : status}
                {!attention && measured?.detail ? ` · ${measured.detail}` : ""}
              </span>
            </span>
            {measured?.progress != null ? (
              <progress
                className={styles.progress}
                value={measured.progress}
                max={1}
                aria-label={`${title} transfer progress`}
              />
            ) : null}
          </span>
        </button>
      </div>
      <div role="gridcell" className={styles.status}>
        <span className={styles.now}>
          {measured?.progress != null
            ? `${Math.round(measured.progress * 100)}%`
            : ""}
          {measured?.progress != null && measured.speed ? " · " : ""}
          {measured?.speed ?? (measured?.progress == null ? elapsed : "")}
          {!running ? relativeTimeFromMs(row.ts) : null}
        </span>
      </div>
      <div role="gridcell" className={styles.rowAction}>
        <Tooltip label={cancellable ? "Cancel Download" : "View Save"}>
          <Button
            icon
            size="xs"
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
                <IconXmarkOutline12 />
              ) : (
                <IconChevronRightOutline12 />
              )}
            </IconSwap>
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
