import { type QueueSummary, QueueSummarySchema } from "@shared/queue-contracts";
import { getDb } from "../../db";

export async function readQueueSummary(): Promise<QueueSummary> {
  const db = await getDb();
  return QueueSummarySchema.parse(
    db.$raw
      .prepare(
        `SELECT
          COALESCE(SUM(status = 'running'), 0) AS running,
          COALESCE(SUM(
            status = 'pending'
            OR status = 'deferred'
              AND deferred_reason IN ('retry_backoff', 'worker_capacity')
          ), 0) AS waiting,
          COALESCE(SUM(
            status = 'deferred'
            AND deferred_reason NOT IN ('retry_backoff', 'worker_capacity')
          ), 0) AS parked,
          COALESCE(SUM(status = 'blocked'), 0) AS failed,
          COALESCE(SUM(status = 'cancelled'), 0) AS cancelled,
          COALESCE(SUM(status = 'dead'), 0) AS dead,
          COUNT(DISTINCT CASE
            WHEN status IN ('pending', 'deferred', 'running', 'blocked', 'dead')
            THEN save_id
          END) AS actionable
        FROM tasks`,
      )
      .get(),
  );
}
