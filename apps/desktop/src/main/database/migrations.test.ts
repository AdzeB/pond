import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { migratePond } from "./migrations";

function nativeSqliteAvailable(): boolean {
  try {
    new Database(":memory:").close();
    return true;
  } catch (error) {
    if (process.versions.electron) throw error;
    return false;
  }
}

describe.skipIf(!nativeSqliteAvailable())("pond database migrations", () => {
  it("creates portable sensitive-content columns", () => {
    const db = new Database(":memory:");
    try {
      migratePond(db);
      const columns = new Map(
        db
          .prepare("pragma table_info(saves)")
          .all()
          .map((row) => {
            const column = z
              .object({ name: z.string(), type: z.string() })
              .parse(row);
            return [column.name, column.type] as const;
          }),
      );
      expect(columns.get("sensitive_score")).toBe("REAL");
      expect(columns.get("sensitive_model")).toBe("TEXT");
    } finally {
      db.close();
    }
  });

  it("creates folder metadata separately from folder rows", () => {
    const db = new Database(":memory:");
    try {
      migratePond(db);
      const columns = db
        .prepare("pragma table_info(folder_metadata)")
        .all()
        .map((row) => z.object({ name: z.string() }).parse(row).name);
      expect(columns).toEqual(["folder_id", "description", "external_link"]);
      const folderColumns = db
        .prepare("pragma table_info(folders)")
        .all()
        .map((row) => z.object({ name: z.string() }).parse(row).name);
      expect(folderColumns).not.toContain("description");
      expect(folderColumns).not.toContain("external_link");
    } finally {
      db.close();
    }
  });

  it("migrates legacy queue rows and creates scheduler indexes", () => {
    const db = new Database(":memory:");
    try {
      migratePond(db);
      db.prepare(
        "INSERT INTO saves (id, source, source_id, url) VALUES (?, ?, ?, ?)",
      ).run("save-1", "twitter", "one", "https://x.com/a/status/1");
      const insertTask = db.prepare(`
        INSERT INTO tasks (
          id, save_id, source, op, status, last_error, created_at, updated_at
        ) VALUES (?, 'save-1', 'twitter', ?, ?, ?, 1, 2)
      `);
      insertTask.run("running", "harvest_metadata", "running", null);
      insertTask.run(
        "cancelled",
        "capture_tweet",
        "failed",
        "cancelled by user",
      );
      insertTask.run("dead", "finalize", "failed", "network failure");

      migratePond(db);

      const statuses = db
        .prepare("SELECT id, status FROM tasks ORDER BY id")
        .all()
        .map((row) =>
          z.object({ id: z.string(), status: z.string() }).parse(row),
        );
      expect(statuses).toEqual([
        { id: "cancelled", status: "cancelled" },
        { id: "dead", status: "dead" },
        { id: "running", status: "pending" },
      ]);

      const indexes = db
        .prepare("PRAGMA index_list(tasks)")
        .all()
        .map((row) => z.object({ name: z.string() }).parse(row).name);
      expect(indexes).toEqual(
        expect.arrayContaining([
          "tasks_claim_idx",
          "tasks_generation_idx",
          "tasks_running_lease_idx",
          "tasks_source_op_idx",
        ]),
      );

      const queueTables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'source_%' OR name = 'queue_generations'",
        )
        .all()
        .map((row) => z.object({ name: z.string() }).parse(row).name);
      expect(queueTables).toEqual(
        expect.arrayContaining([
          "queue_generations",
          "source_gates",
          "source_request_ledger",
        ]),
      );
    } finally {
      db.close();
    }
  });

  it("migrates Queue V2 in a temporary Library", () => {
    const root = mkdtempSync(join(tmpdir(), "pond-queue-migration-"));
    const file = join(root, "index.db");
    try {
      const created = new Database(file);
      migratePond(created);
      created
        .prepare(
          `INSERT INTO saves (id, source, source_id, url)
            VALUES ('save', 'twitter', 'one', 'https://x.com/a/status/1')`,
        )
        .run();
      created
        .prepare(
          `INSERT INTO tasks (
              id, save_id, source, op, status, last_error
            ) VALUES (
              'legacy', 'save', 'twitter', 'harvest_metadata', 'failed',
              'network failure'
            )`,
        )
        .run();
      migratePond(created);
      created.close();

      const reopened = new Database(file);
      expect(
        reopened
          .prepare(
            "SELECT status, failed_at IS NOT NULL AS failed FROM tasks WHERE id = 'legacy'",
          )
          .get(),
      ).toEqual({ status: "dead", failed: 1 });
      expect(
        reopened
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'source_gates'",
          )
          .get(),
      ).toEqual({ name: "source_gates" });
      reopened.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
