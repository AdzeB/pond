import { describe, expect, it } from "vitest";
import { backfillRawSlim } from "./raw-slim";

describe("raw-slim migration", () => {
  it("processes old rows in bounded batches", () => {
    const rows: Array<{
      id: string;
      rawJson: string;
      rawSlim: string | null;
      savedAt: number;
    }> = Array.from({ length: 501 }, (_, index) => ({
      id: String(index),
      rawJson: "{}",
      rawSlim: null,
      savedAt: index,
    }));
    const store = {
      readBatch(limit: number) {
        return rows
          .filter((row) => row.rawSlim === null)
          .sort((a, b) => b.savedAt - a.savedAt || b.id.localeCompare(a.id))
          .slice(0, limit);
      },
      writeBatch(batch: Array<{ id: string; rawSlim: string }>) {
        for (const next of batch) {
          const row = rows.find((candidate) => candidate.id === next.id);
          if (row) row.rawSlim = next.rawSlim;
        }
      },
    };

    expect(backfillRawSlim(store, 500)).toEqual({
      processed: 500,
      hasMore: true,
    });
    expect(rows.filter((row) => row.rawSlim === null)).toHaveLength(1);
    expect(backfillRawSlim(store, 500)).toEqual({
      processed: 1,
      hasMore: false,
    });
  });
});
