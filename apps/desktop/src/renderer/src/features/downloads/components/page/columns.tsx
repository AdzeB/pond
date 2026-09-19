import { sourceLabel } from "@pond/schema/sources";
import type { RenderRowArgs, TableColumn } from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { BrandTile } from "@/features/sources/components/sync-monitor-source-tile";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import {
  describeDownloadActivity,
  formatDuration,
} from "../../lib/download-progress";
import { downloadBrandSource } from "./brand";
import {
  type DownloadTableStatus,
  downloadStatusLabel,
  downloadTableStatus,
  isDownloadProcessing,
  isDownloadStopped,
} from "./status";
import styles from "./styles.module.css";

export interface DownloadViewRow extends DownloadRow {
  paused: boolean;
  activity?: DownloadActivity;
  now: number;
  inspected: boolean;
}

const RING = 100;

function measuredActivity(row: DownloadViewRow) {
  return row.status === "running" && row.activity?.state === "running"
    ? describeDownloadActivity(row.activity, row.now)
    : null;
}

function StatusGlyph({ status }: { status: DownloadTableStatus }) {
  const complete = status === "complete";
  const progress = status === "progress";
  const failed = status === "failed";
  const paused = status === "paused";
  const idle = status === "cancelled" || status === "skipped";
  return (
    <svg
      className={styles.glyph}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden
    >
      <title>{status}</title>
      <circle
        cx="8"
        cy="8"
        r="6"
        fill={complete ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={idle ? "2 2.5" : undefined}
        opacity={complete ? 1 : 0.45}
      />
      {progress ? (
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={`${0.65 * RING} ${RING}`}
          pathLength={RING}
          transform="rotate(-90 8 8)"
        />
      ) : null}
      {complete ? (
        <path
          d="M5.2 8.2 7 10 10.8 6"
          fill="none"
          stroke="var(--ds-gray-1)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {failed ? (
        <path
          d="M5.6 5.6 10.4 10.4 M10.4 5.6 5.6 10.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : null}
      {paused ? (
        <>
          <rect x="5.55" y="5.35" width="1.55" height="5.3" rx="0.4" />
          <rect x="8.9" y="5.35" width="1.55" height="5.3" rx="0.4" />
        </>
      ) : null}
    </svg>
  );
}

function NameCell({ row }: { row: DownloadViewRow }) {
  const title = row.name.trim() || row.url.trim() || "Untitled save";
  const measured = measuredActivity(row);
  return (
    <button
      type="button"
      className={styles.open}
      aria-label={`Inspect ${title}`}
    >
      <span className={styles.lead}>
        <span className={styles.name} title={title}>
          {title}
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
    </button>
  );
}

function SourceCell({ row }: { row: DownloadViewRow }) {
  const source = downloadBrandSource(row.source, row.url);
  return (
    <span className={styles.source}>
      <BrandTile source={source} size={18} />
      <span className={styles["source-label"]}>{sourceLabel(source)}</span>
    </span>
  );
}

function StatusCell({ row }: { row: DownloadViewRow }) {
  const status = downloadTableStatus(row, row.paused);
  return (
    <span className={styles.status} title={row.error ?? undefined}>
      <span className={styles.mark} data-status={status}>
        <StatusGlyph status={status} />
      </span>
      <span className={styles["status-label"]}>
        {downloadStatusLabel(row, row.paused)}
      </span>
    </span>
  );
}

function TimeCell({ row }: { row: DownloadViewRow }) {
  const running = row.status === "running";
  const measured = measuredActivity(row);
  const elapsed =
    running && row.activity
      ? formatDuration(row.now - row.activity.phaseStartedAt)
      : null;
  return (
    <span className={styles.metric}>
      {measured?.progress != null
        ? `${Math.round(measured.progress * 100)}%`
        : ""}
      {measured?.progress != null && measured.speed ? " · " : ""}
      {measured?.speed ?? (measured?.progress == null ? elapsed : "")}
      {!running ? relativeTimeFromMs(row.ts) : null}
    </span>
  );
}

export const downloadsColumns: TableColumn<DownloadViewRow>[] = [
  {
    id: "name",
    header: "Name",
    sortLabel: "Name",
    accessor: (row) => row.name,
    width: "minmax(0, 1fr)",
    cell: (row) => <NameCell row={row} />,
  },
  {
    id: "source",
    header: "Source",
    sortLabel: "Source",
    accessor: (row) => sourceLabel(downloadBrandSource(row.source, row.url)),
    width: "minmax(0, 140px)",
    cell: (row) => <SourceCell row={row} />,
  },
  {
    id: "now",
    header: "Now",
    sortLabel: "Now",
    accessor: (row) => row.ts,
    width: "minmax(0, 120px)",
    cell: (row) => <TimeCell row={row} />,
  },
  {
    id: "status",
    header: "Status",
    sortLabel: "Status",
    accessor: (row) => downloadStatusLabel(row, row.paused),
    width: "minmax(0, 120px)",
    cell: (row) => <StatusCell row={row} />,
  },
];

export function DownloadQueueRow({
  row,
  rowProps,
  cells,
}: RenderRowArgs<DownloadViewRow>) {
  const running = row.status === "running";
  const measured = measuredActivity(row);
  return (
    <div
      {...rowProps}
      className={`${rowProps.className} ${styles.row}`}
      data-status={row.status}
      data-inspected={row.inspected || undefined}
      data-stalled={measured?.stalled || undefined}
      data-moving={running || undefined}
      data-processing={isDownloadProcessing(row) || undefined}
      data-paused={isDownloadStopped(row, row.paused) || undefined}
    >
      {cells}
    </div>
  );
}
