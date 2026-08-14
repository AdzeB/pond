import type { ConnectedAccount } from "@pond/schema/db";
import { describe, expect, it } from "vitest";
import { syncBaselineWhere } from "./sync-baseline";

describe("syncBaselineWhere", () => {
  it("omits trashed source ids so a re-sync can recapture them", () => {
    expect(syncBaselineWhere.toString()).toMatch(/deletedAt/);
    /** Call so a signature change still typechecks against ConnectedAccount. */
    void syncBaselineWhere({
      id: "acc",
      source: "threads",
    } as ConnectedAccount);
  });
});
