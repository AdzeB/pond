import { sourceLabel } from "@pond/schema/sources";
import type { RenderRowArgs, TableColumn } from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
import { useDownloadClock } from "@/features/downloads/hooks/use-download-activity";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { BrandTile } from "@/features/sources/components/sync-monitor-source-tile";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import { describeDownloadActivity } from "../../lib/download-progress";
import { downloadBrandSource } from "./brand";
import { DownloadContextMenu } from "./context-menu";
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
}

const RING = 100;

function measuredActivity(row: DownloadViewRow, now: number) {
  return row.status === "running" && row.activity?.state === "running"
    ? describeDownloadActivity(row.activity, now)
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
  const label = downloadStatusLabel(row, row.paused);
  return (
    <span className={styles.status}>
      <span className={styles.mark} data-status={status}>
        <StatusGlyph status={status} />
      </span>
      <span className={styles["status-label"]}>{label}</span>
    </span>
  );
}

function ProgressRing({ value }: { value: number }) {
  return (
    <svg
      className={styles["progress-ring"]}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden
    >
      <circle
        className={styles["progress-ring-track"]}
        cx="8"
        cy="8"
        r="6"
        fill="none"
        strokeWidth="2"
      />
      <circle
        className={styles["progress-ring-value"]}
        cx="8"
        cy="8"
        r="6"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${value * RING} ${RING}`}
        pathLength={RING}
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
}

function ProgressCell({ row }: { row: DownloadViewRow }) {
  const running = row.status === "running";
  const now = useDownloadClock(running && row.activity?.state === "running");
  const measured = measuredActivity(row, now);
  const rawProgress =
    measured?.progress ??
    (running ? row.progress : row.status === "complete" ? 1 : 0) ??
    0;
  const progress = Math.max(0, Math.min(1, rawProgress));
  const percentage = Math.round(progress * 100);
  const title = row.name.trim() || row.url.trim() || "Untitled save";
  return (
    <span
      className={styles["progress-cell"]}
      role="progressbar"
      aria-label={`${title} transfer progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <ProgressRing value={progress} />
      <span className={styles.metric}>{percentage}%</span>
    </span>
  );
}

function AddedCell({ row }: { row: DownloadViewRow }) {
  return (
    <span className={`${styles.metric} ${styles.added}`}>
      {relativeTimeFromMs(row.ts)}
    </span>
  );
}

export const downloadsColumns: TableColumn<DownloadViewRow>[] = [
  {
    id: "name",
    header: "Name",
    sortLabel: "Name",
    accessor: (row) => row.name,
    width: "minmax(0, 2fr)",
    cell: (row) => <NameCell row={row} />,
  },
  {
    id: "source",
    header: "Source",
    sortLabel: "Source",
    accessor: (row) => sourceLabel(downloadBrandSource(row.source, row.url)),
    width: "minmax(0, 0.7fr)",
    cell: (row) => <SourceCell row={row} />,
  },
  {
    id: "stage",
    header: "Stage",
    sortLabel: "Stage",
    accessor: (row) => downloadStatusLabel(row, row.paused),
    width: "minmax(0, 1.25fr)",
    cell: (row) => <StatusCell row={row} />,
  },
  {
    id: "progress",
    header: "Progress",
    sortLabel: "Progress",
    accessor: (row) =>
      measuredActivity(row, Date.now())?.progress ?? row.progress ?? -1,
    width: "minmax(0, 0.8fr)",
    cell: (row) => <ProgressCell row={row} />,
  },
  {
    id: "added",
    header: "Added",
    sortLabel: "Added",
    accessor: (row) => row.ts,
    width: "140px",
    cell: (row) => <AddedCell row={row} />,
  },
];

export function DownloadQueueRow({
  row,
  rowProps,
  cells,
}: RenderRowArgs<DownloadViewRow>) {
  const running = row.status === "running";
  const now = useDownloadClock(running && row.activity?.state === "running");
  const measured = measuredActivity(row, now);
  return (
    <DownloadContextMenu row={row}>
      <div
        {...rowProps}
        className={`${rowProps.className} ${styles.row}`}
        data-status={row.status}
        data-stalled={measured?.stalled || undefined}
        data-moving={running || undefined}
        data-processing={isDownloadProcessing(row) || undefined}
        data-paused={isDownloadStopped(row, row.paused) || undefined}
      >
        {cells}
      </div>
    </DownloadContextMenu>
  );
}
