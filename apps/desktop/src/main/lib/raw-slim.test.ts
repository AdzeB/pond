import type Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { backfillRawSlimBatch } from "./raw-slim";

describe("raw-slim migration", () => {
  it("processes old rows in bounded batches", () => {
    const rows = Array.from({ length: 501 }, (_, index) => ({
      id: String(index),
      rawJson: "{}",
      rawSlim: null as string | null,
      savedAt: index,
    }));
    const sqlite = {
      prepare(sql: string) {
        if (sql.includes("SELECT id")) {
          return {
            all(limit: number) {
              return rows
                .filter((row) => row.rawSlim === null)
                .sort(
                  (a, b) => b.savedAt - a.savedAt || b.id.localeCompare(a.id),
                )
                .slice(0, limit);
            },
          };
        }
        return {
          run(rawSlim: string, id: string) {
            const row = rows.find((candidate) => candidate.id === id);
            if (row) row.rawSlim = rawSlim;
          },
        };
      },
      transaction<TArgs extends unknown[], TResult>(
        callback: (...args: TArgs) => TResult,
      ) {
        return callback;
      },
    } as unknown as Database.Database;

    expect(backfillRawSlimBatch(sqlite, 500)).toEqual({
      processed: 500,
      hasMore: true,
    });
    expect(rows.filter((row) => row.rawSlim === null)).toHaveLength(1);
    expect(backfillRawSlimBatch(sqlite, 500)).toEqual({
      processed: 1,
      hasMore: false,
    });
  });
});
