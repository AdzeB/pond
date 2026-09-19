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
});
