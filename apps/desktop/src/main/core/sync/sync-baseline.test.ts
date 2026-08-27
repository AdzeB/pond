import { describe, expect, it } from "vitest";
import { syncBaselineWhere } from "./sync-baseline";

describe("syncBaselineWhere", () => {
  it("omits trashed source ids so a re-sync can recapture them", () => {
    expect(syncBaselineWhere.toString()).toMatch(/deletedAt/);
    void syncBaselineWhere({ id: "acc", source: "threads" });
  });
});
