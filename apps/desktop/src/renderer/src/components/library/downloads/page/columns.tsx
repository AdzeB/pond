import { type TableColumn, Tooltip } from "@pond/ui";
import { getSourceLabel } from "@/lib/save/source-labels";
import { getSourceIcon, getSourceLogo } from "@/lib/save/sources-registry";
import { type DownloadRow, LIVE_ORDER } from "@/lib/status-feed";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import styles from "./styles.module.css";

const STATUS_LABEL = {
  pending: "Queued",
  running: "In progress",
  blocked: "Blocked",
  failed: "Failed",
  cancelled: "Cancelled",
  complete: "Complete",
} satisfies Record<DownloadRow["status"], string>;

const RING = 100;

function titleOf(row: DownloadRow): string {
  return row.name.trim() || row.url.trim() || "Untitled save";
}

function statusOf(row: DownloadRow): string {
  if (row.status === "running" && row.stage) return row.stage;
  if (row.status === "blocked" && row.stage) return row.stage;
  return STATUS_LABEL[row.status];
}

function progressOf(row: DownloadRow): number {
  if (row.status === "complete") return 1;
  if (row.progress == null) return 0;
  return Math.min(1, Math.max(0, row.progress));
}

function StatusGlyph({
  status,
  progress,
}: {
  status: DownloadRow["status"];
  progress: number;
}) {
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
        fill={status === "complete" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={status === "pending" ? "2 2.5" : undefined}
        opacity={status === "complete" ? 1 : 0.45}
      />
      {status === "running" || status === "blocked" ? (
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={`${progress * RING} ${RING}`}
          pathLength={RING}
          transform="rotate(-90 8 8)"
        />
      ) : null}
      {status === "complete" ? (
        <path
          d="M5.2 8.2 7 10 10.8 6"
          fill="none"
          stroke="var(--ds-gray-1)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {status === "failed" ? (
        <path
          d="M5.6 5.6 10.4 10.4 M10.4 5.6 5.6 10.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : null}
      {status === "running" || status === "pending" ? (
        <path d="M6.35 5.15 10.9 8 6.35 10.85 Z" fill="currentColor" />
      ) : null}
      {status === "blocked" ? (
        <>
          <rect x="5.55" y="5.35" width="1.55" height="5.3" rx="0.4" />
          <rect x="8.9" y="5.35" width="1.55" height="5.3" rx="0.4" />
        </>
      ) : null}
    </svg>
  );
}

/** A queue thousands deep reads as broken when every waiting row shows the same 0%. */
function readoutOf(row: DownloadRow, progress: number): string {
  if (row.status === "running" || row.status === "blocked") {
    return `${Math.round(progress * 100)}%`;
  }
  return STATUS_LABEL[row.status];
}

function StatusMark({ row }: { row: DownloadRow }) {
  const label = row.error ?? statusOf(row);
  const progress = progressOf(row);
  return (
    <Tooltip label={label}>
      <button type="button" className={styles.status} aria-label={label}>
        <span className={styles.mark} data-status={row.status}>
          <StatusGlyph status={row.status} progress={progress} />
        </span>
        <span className={styles.percent}>{readoutOf(row, progress)}</span>
      </button>
    </Tooltip>
  );
}

function SourceMark({ source }: { source: string }) {
  const label = getSourceLabel(source);
  const logo = getSourceLogo(source);
  const Icon = getSourceIcon(source);
  return (
    <span className={styles.source} title={label}>
      {logo ? (
        <img src={logo} alt={label} />
      ) : Icon ? (
        <span role="img" aria-label={label}>
          <Icon />
        </span>
      ) : null}
    </span>
  );
}

export const downloadsColumns: TableColumn<DownloadRow>[] = [
  {
    id: "title",
    header: "Title",
    accessor: (row) => titleOf(row),
    width: "minmax(0, 1fr)",
    cell: (row) => (
      <span className={styles.lead}>
        <SourceMark source={row.source} />
        <span className={styles.title}>{titleOf(row)}</span>
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    /** Sorting by state ascending puts what is running above what is only waiting. */
    accessor: (row) => LIVE_ORDER[row.status],
    width: "80px",
    cell: (row) => <StatusMark row={row} />,
  },
  {
    id: "time",
    header: "Time",
    accessor: (row) => row.ts,
    width: "120px",
    align: "end",
    cell: (row) => (
      <span className={styles.time}>{relativeTimeFromMs(row.ts)}</span>
    ),
  },
];
