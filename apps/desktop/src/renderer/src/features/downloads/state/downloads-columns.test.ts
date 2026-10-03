import { beforeEach, describe, expect, it } from "vitest";
import {
  downloadsColumnsLayout,
  mergeVisibleColumnOrder,
  normalizeDownloadsColumnLayout,
} from "./downloads-columns";

describe("downloads column layout", () => {
  beforeEach(() => {
    downloadsColumnsLayout.reset();
  });

  it("keeps Name visible and restores a hidden column in its place", () => {
    downloadsColumnsLayout.setHidden("name", true);
    downloadsColumnsLayout.setHidden("speed", true);
    expect(downloadsColumnsLayout.snapshot().hidden).toEqual(["speed"]);
    downloadsColumnsLayout.setHidden("speed", false);
    expect(downloadsColumnsLayout.snapshot().hidden).toEqual([]);
    expect(downloadsColumnsLayout.snapshot().order).toContain("speed");
  });

  it("reorders visible columns without moving a hidden one", () => {
    downloadsColumnsLayout.setHidden("source", true);
    const hidden = downloadsColumnsLayout.snapshot().hidden;
    const next = mergeVisibleColumnOrder(
      downloadsColumnsLayout.snapshot().order,
      hidden,
      ["name", "stage", "speed", "size", "remaining", "progress", "added"],
    );
    expect(next.indexOf("source")).toBeLessThan(next.indexOf("stage"));
    expect(next.indexOf("speed")).toBeLessThan(next.indexOf("size"));
  });

  it("keeps a known sort and drops an unknown one", () => {
    downloadsColumnsLayout.setSort({ id: "added", desc: true });
    expect(downloadsColumnsLayout.snapshot().sort).toEqual({
      id: "added",
      desc: true,
    });
    expect(
      normalizeDownloadsColumnLayout({
        sort: { id: "missing", desc: true },
      }).sort,
    ).toBeNull();
  });

  it("drops unknown columns and appends new ones", () => {
    expect(
      normalizeDownloadsColumnLayout({
        order: ["added", "nope", "name"],
        hidden: ["name", "added", "missing"],
      }),
    ).toMatchObject({
      order: [
        "added",
        "name",
        "source",
        "stage",
        "size",
        "speed",
        "remaining",
        "progress",
        "elapsed",
        "files",
        "attempts",
        "server",
        "error",
      ],
      hidden: ["added"],
    });
  });
});
