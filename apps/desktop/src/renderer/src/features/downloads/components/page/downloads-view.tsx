import { Button } from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
import type { ReactNode } from "react";
import { useClientHeight } from "@/shared/hooks/use-client-height";
import { type DownloadRow, mergeDownloadRows } from "../../lib/status-feed";
import { DownloadTable } from "./download-table";
import styles from "./styles.module.css";

export interface DownloadsViewProps {
  rows: DownloadRow[];
  completed: DownloadRow[];
  activities: readonly DownloadActivity[];
  paused: boolean;
  now: number;
  inspectedId: string | null;
  onInspect: (row: DownloadRow) => void;
  historyLoading: boolean;
  historyError: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetryHistory: () => void;
  empty?: ReactNode;
}

export function DownloadsView(props: DownloadsViewProps) {
  const rows = mergeDownloadRows(props.rows, props.completed);
  const { ref, height } = useClientHeight();
  const extra = props.historyError ? (
    <div className={styles.message} role="alert">
      Couldn't load download history.
      <Button size="sm" variant="text" onClick={props.onRetryHistory}>
        Try Again
      </Button>
    </div>
  ) : props.hasMore ? (
    <div className={styles.more}>
      <Button
        size="sm"
        variant="ghost"
        disabled={props.loadingMore}
        onClick={props.onLoadMore}
      >
        {props.loadingMore ? "Loading" : "Load More"}
      </Button>
    </div>
  ) : props.historyLoading && rows.length === 0 ? (
    <p className={styles.message} role="status">
      Loading download history
    </p>
  ) : null;
  if (rows.length === 0 && !extra) {
    return <div className={styles.content}>{props.empty}</div>;
  }
  return (
    <div className={styles.content}>
      <div ref={ref} className={styles.table}>
        <DownloadTable
          rows={rows}
          paused={props.paused}
          activities={props.activities}
          now={props.now}
          inspectedId={props.inspectedId}
          onInspect={props.onInspect}
          height={height > 88 ? height - 40 : undefined}
          extra={extra}
        />
      </div>
    </div>
  );
}
