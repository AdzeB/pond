import { describe, expect, it } from "vitest";
import { countSidebarSaves, formatCount } from "./counts";

describe("countSidebarSaves", () => {
  it("splits active, unfiled, untagged, trash, and folder memberships", () => {
    expect(
      countSidebarSaves(
        [
          { id: "a", deletedAt: null, tags: ["design"] },
          { id: "b", deletedAt: null, tags: [] },
          { id: "c", deletedAt: null, tags: [] },
          { id: "d", deletedAt: 1, tags: [] },
        ],
        { a: ["root"], b: ["root", "child"] },
      ),
    ).toEqual({
      library: 3,
      uncategorized: 1,
      untagged: 2,
      trash: 1,
      folders: { root: 2, child: 1 },
    });
  });
});

describe("formatCount", () => {
  it("uses grouped digits", () => {
    expect(formatCount(7782)).toBe("7,782");
  });
});
