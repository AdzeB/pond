import { beforeEach, describe, expect, it } from "vitest";
import { navigationHistory } from "./navigation-history";

describe("navigation history", () => {
  beforeEach(() => navigationHistory.clear());

  it("records, jumps, truncates forward entries, and clears", () => {
    navigationHistory.record({ kind: "folder", id: "one" });
    navigationHistory.record({ kind: "tag", name: "Design" });
    expect(navigationHistory.snapshot()).toMatchObject({ index: 2 });
    expect(navigationHistory.back()).toEqual({ kind: "folder", id: "one" });
    navigationHistory.record({ kind: "trash" });
    expect(navigationHistory.snapshot().entries).toEqual([
      { kind: "all" },
      { kind: "folder", id: "one" },
      { kind: "trash" },
    ]);
    navigationHistory.clear();
    expect(navigationHistory.snapshot()).toEqual({
      entries: [{ kind: "trash" }],
      index: 0,
    });
  });
});
