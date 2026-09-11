import { IconChevronRightOutline18 } from "@pond/icons/outline/18";
import { Accordion, Button } from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
import type { ReactNode } from "react";
import type { DownloadRow } from "../../lib/status-feed";
import { DownloadTable } from "./download-table";
import styles from "./page.module.css";
import { isDownloadAttention, isDownloadStopped } from "./status";

export interface DownloadsViewProps {
  rows: DownloadRow[];
  completed: DownloadRow[];
  activities: readonly DownloadActivity[];
  paused: boolean;
  now: number;
  inspectedId: string | null;
  onInspect: (row: DownloadRow) => void;
  searching: boolean;
  historyLoading: boolean;
  historyError: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetryHistory: () => void;
  empty?: ReactNode;
}

export function DownloadsView(props: DownloadsViewProps) {
  const { rows, completed, searching } = props;
  const active = rows.filter((row) => row.status === "running");
  const waiting = rows.filter((row) => row.status === "pending");
  const waitingPaused =
    waiting.length > 0 &&
    waiting.every((row) => isDownloadStopped(row, props.paused));
  const attention = rows.filter(isDownloadAttention);
  const cancelled = rows.filter((row) => row.status === "cancelled");
  const table = (data: DownloadRow[], header = false) => (
    <DownloadTable
      rows={data}
      header={header}
      paused={props.paused}
      activities={props.activities}
      now={props.now}
      inspectedId={props.inspectedId}
      onInspect={props.onInspect}
    />
  );
  return (
    <div className={styles.downloads}>
      {active.length > 0 ? table(active, true) : props.empty}
      {attention.length > 0 ? (
        <section className={styles.attention} aria-label="Needs attention">
          <h2>
            Needs Attention <span>{attention.length}</span>
          </h2>
          {table(attention)}
        </section>
      ) : null}
      <Accordion.Root
        key={searching ? "search" : "browse"}
        defaultValue={searching ? ["waiting", "completed", "cancelled"] : []}
        className={styles.groups}
      >
        <Accordion.Item value="waiting">
          <Accordion.Header>
            <Accordion.Trigger className={styles.groupTrigger}>
              <IconChevronRightOutline18 />{" "}
              <span>{waitingPaused ? "Paused" : "Waiting"}</span>
              <span className={styles.count}>{waiting.length}</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>
            {waiting.length > 0 ? (
              table(waiting)
            ) : (
              <p className={styles.groupEmpty}>No downloads waiting</p>
            )}
          </Accordion.Panel>
        </Accordion.Item>
        {cancelled.length > 0 ? (
          <Accordion.Item value="cancelled">
            <Accordion.Header>
              <Accordion.Trigger className={styles.groupTrigger}>
                <IconChevronRightOutline18 />
                <span>Cancelled</span>
                <span className={styles.count}>{cancelled.length}</span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>{table(cancelled)}</Accordion.Panel>
          </Accordion.Item>
        ) : null}
        <Accordion.Item value="completed">
          <Accordion.Header>
            <Accordion.Trigger className={styles.groupTrigger}>
              <IconChevronRightOutline18 />
              <span>Completed</span>
              <span className={styles.count}>
                {props.historyLoading || props.historyError
                  ? ""
                  : `${completed.length}${props.hasMore ? "+" : ""}`}
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>
            {props.historyLoading ? (
              <p className={styles.message} role="status">
                Loading download history
              </p>
            ) : null}
            {props.historyError ? (
              <div className={styles.message} role="alert">
                Couldn't load download history.
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={props.onRetryHistory}
                >
                  Try Again
                </Button>
              </div>
            ) : null}
            {completed.length > 0 ? (
              table(completed)
            ) : !props.historyLoading && !props.historyError ? (
              <p className={styles.groupEmpty}>
                No completed downloads
                {searching ? " match your search" : " yet"}
              </p>
            ) : null}
            {props.hasMore ? (
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
            ) : null}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
