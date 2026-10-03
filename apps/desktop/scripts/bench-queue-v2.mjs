import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import Database from "better-sqlite3";

const sizes = [8_000, 10_000, 100_000];

for (const size of sizes) {
  const directory = mkdtempSync(join(tmpdir(), "pond-queue-bench-"));
  const db = new Database(join(directory, "queue.db"));
  db.pragma("journal_mode = WAL");
  try {
    db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      save_id TEXT NOT NULL,
      source TEXT NOT NULL,
      op TEXT NOT NULL,
      status TEXT NOT NULL,
      deferred_reason TEXT,
      next_run_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      lease_expires_at INTEGER
    );
    CREATE INDEX tasks_claim_idx
      ON tasks(source, op, next_run_at, created_at)
      WHERE status IN ('pending', 'deferred');
    CREATE INDEX tasks_running_lease_idx
      ON tasks(lease_expires_at)
      WHERE status = 'running';
    `);
    const insert = db.prepare(
      `INSERT INTO tasks (
      id, save_id, source, op, status, next_run_at, created_at
    ) VALUES (?, ?, ?, 'harvest_metadata', 'pending', 0, ?)`,
    );
    db.transaction(() => {
      for (let index = 0; index < size; index++) {
        const source = index % 5 === 0 ? "web" : "twitter";
        insert.run(`task-${index}`, `save-${index}`, source, index);
      }
    })();

    const claimStarted = performance.now();
    db.prepare(
      `SELECT id
    FROM tasks
    WHERE status IN ('pending', 'deferred') AND next_run_at <= ?
    ORDER BY next_run_at, created_at
    LIMIT 500`,
    ).all(Date.now());
    const claimMs = performance.now() - claimStarted;

    const aggregateStarted = performance.now();
    db.prepare(
      `SELECT
      SUM(status = 'running') AS running,
      SUM(status = 'pending') AS waiting,
      COUNT(DISTINCT CASE
        WHEN status IN ('pending', 'deferred', 'running', 'blocked', 'dead')
        THEN save_id
      END) AS actionable
    FROM tasks`,
    ).get();
    const aggregateMs = performance.now() - aggregateStarted;

    const sqliteVersion = db
      .prepare("SELECT sqlite_version() AS version")
      .get();
    const journalMode = db.pragma("journal_mode", { simple: true });
    const checkpoint = db.pragma("wal_checkpoint(TRUNCATE)", { simple: false });
    console.log(
      JSON.stringify({
        tasks: size,
        claimMs: Number(claimMs.toFixed(2)),
        aggregateMs: Number(aggregateMs.toFixed(2)),
        sqliteVersion: sqliteVersion.version,
        journalMode,
        checkpoint,
      }),
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
}
