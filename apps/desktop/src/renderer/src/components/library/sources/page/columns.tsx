import type { TableColumn } from "@pond/ui";
import { useState } from "react";
import {
  getSourceDef,
  getSourceIcon,
  getSourceLogo,
} from "@/lib/save/sources-registry";
import { formatNumber } from "@/lib/util/format";
import { relativeTime } from "@/lib/util/relative-time";
import type { SourceStatusId } from "./lib/filters";
import type { SourceTableRow } from "./lib/helpers";
import styles from "./styles.module.css";

const RING = 100;

function NameMark({ row }: { row: SourceTableRow }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pfp =
    row.avatarUrl && row.avatarUrl !== failedUrl ? row.avatarUrl : null;
  const { logo } = getSourceDef(row.source);
  const src = pfp ?? logo ?? undefined;
  const variant = pfp ? "account" : "source";

  return (
    <span className={styles.lead}>
      <span className={styles.art} data-variant={variant}>
        {src ? (
          <img
            src={src}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => {
              if (pfp) setFailedUrl(pfp);
            }}
          />
        ) : null}
      </span>
      <span className={styles.name}>{row.name}</span>
      <span className={styles.count}>{formatNumber(row.items)}</span>
    </span>
  );
}

function StatusGlyph({ status }: { status: SourceStatusId }) {
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
        fill={status === "active" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={status === "offline" ? "2 2.5" : undefined}
        opacity={status === "active" ? 1 : 0.45}
      />
      {status === "syncing" ? (
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
      {status === "active" ? (
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
      {status === "paused" ? (
        <>
          <rect x="5.55" y="5.35" width="1.55" height="5.3" rx="0.4" />
          <rect x="8.9" y="5.35" width="1.55" height="5.3" rx="0.4" />
        </>
      ) : null}
    </svg>
  );
}

function StatusMark({ row }: { row: SourceTableRow }) {
  return (
    <span className={styles.status}>
      <span className={styles.mark} data-status={row.statusId}>
        <StatusGlyph status={row.statusId} />
      </span>
      <span className={styles["status-label"]}>{row.statusLabel}</span>
    </span>
  );
}

function SourceMark({ source, label }: { source: string; label: string }) {
  const logo = getSourceLogo(source);
  const Icon = getSourceIcon(source);
  return (
    <span className={styles.source}>
      <span className={styles.logo}>
        {logo ? <img src={logo} alt="" /> : Icon ? <Icon /> : null}
      </span>
      <span className={styles.meta}>{label}</span>
    </span>
  );
}

export const sourcesColumns: TableColumn<SourceTableRow>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (row) => row.name,
    width: "minmax(160px, 1fr)",
    cell: (row) => <NameMark row={row} />,
  },
  {
    id: "lastSynced",
    header: "Last Synced",
    accessor: (row) => row.lastSyncedMs,
    width: "120px",
    align: "end",
    cell: (row) => (
      <span className={styles.metric}>
        {row.lastSyncedAt ? relativeTime(row.lastSyncedAt) : "—"}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => row.statusLabel,
    width: "120px",
    cell: (row) => <StatusMark row={row} />,
  },
  {
    id: "source",
    header: "Source",
    accessor: (row) => row.sourceLabel,
    width: "140px",
    cell: (row) => <SourceMark source={row.source} label={row.sourceLabel} />,
  },
  {
    id: "type",
    header: "Type",
    accessor: (row) => row.kindLabel,
    width: "100px",
    cell: (row) => <span className={styles.meta}>{row.kindLabel}</span>,
  },
];
