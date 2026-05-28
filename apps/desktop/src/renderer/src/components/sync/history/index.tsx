import { Button, Dialog } from "@pond/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityDialog } from "@/components/capture/activity-dialog";
import { getSourceLabel } from "@/lib/source-labels";
import { formatRelative } from "@/lib/sync-helpers";
import styles from "./styles.module.css";

interface SyncRunRow {
  id: number;
  ts: number;
  source: string | null;
  outcome: string;
  durationMs: number | null;
  trigger: string | null;
  payload: {
    harvest: { seen: number | null; fresh: number | null } | null;
    enqueue: { succeeded: number; failed: number } | null;
    error: { name: string; message: string } | null;
  } | null;
}

export function History() {
  const [activityOpen, setActivityOpen] = useState(false);

  const { data } = useQuery<{ rows: SyncRunRow[] }>({
    queryKey: ["sync", "history"],
    queryFn: () =>
      window.pond.query("pipeline.events.list", {
        kind: "sync.run.completed",
        limit: 50,
      }) as Promise<{ rows: SyncRunRow[] }>,
    refetchInterval: 15_000,
  });

  const rows = data?.rows ?? [];

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.heading}>History</h2>
        <Dialog.Root open={activityOpen} onOpenChange={setActivityOpen}>
          <Dialog.Trigger
            render={
              <Button size="sm" variant="ghost">
                Open Activity
              </Button>
            }
          />
          <ActivityDialog open={activityOpen} />
        </Dialog.Root>
      </header>
      {rows.length === 0 ? (
        <p className={styles.empty}>No syncs yet.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li
              key={row.id}
              className={styles.row}
              data-outcome={row.outcome}
              title={
                row.payload?.error
                  ? `${row.payload.error.name}: ${row.payload.error.message}`
                  : undefined
              }
            >
              <span className={styles.source}>
                {row.source ? getSourceLabel(row.source) : "(all)"}
              </span>
              <span className={styles.outcome} data-outcome={row.outcome}>
                {row.outcome}
              </span>
              <span className={styles.meta}>
                {formatRelative(new Date(row.ts))}
                {row.durationMs != null
                  ? ` \u00B7 ${Math.round(row.durationMs / 100) / 10}s`
                  : ""}
                {row.payload?.harvest
                  ? ` \u00B7 seen ${row.payload.harvest.seen ?? 0}, fresh ${row.payload.harvest.fresh ?? 0}`
                  : ""}
                {row.payload?.enqueue
                  ? ` \u00B7 queued ${row.payload.enqueue.succeeded}`
                  : ""}
              </span>
              <span className={styles.trigger}>{row.trigger ?? ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
