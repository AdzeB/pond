import { describe, expect, it } from "vitest";
import {
  type DetailRow,
  groupDetailRows,
  isSameTitleAndContent,
} from "./detail";

function row(id: string, label = id): DetailRow {
  return { id, label, value: id, kind: "text" };
}

describe("groupDetailRows", () => {
  it("splits identity, file, and dates into separate islands", () => {
    const groups = groupDetailRows([
      row("id", "ID"),
      row("author", "Author"),
      row("platform", "Platform"),
      row("type", "Type"),
      row("size", "Size"),
      row("published", "Published"),
      row("imported", "Imported"),
    ]);

    expect(groups.map((g) => g.title)).toEqual(["Properties", "File", "Dates"]);
    expect(groups[0]?.rows.map((r) => r.id)).toEqual([
      "author",
      "platform",
      "type",
    ]);
    expect(groups[1]?.rows.map((r) => r.id)).toEqual(["size", "id"]);
    expect(groups[2]?.rows.map((r) => r.id)).toEqual(["published", "imported"]);
  });

  it("omits empty islands", () => {
    const groups = groupDetailRows([row("author", "Author")]);
    expect(groups.map((g) => g.title)).toEqual(["Properties"]);
  });
});

describe("isSameTitleAndContent", () => {
  it("treats a title that is the content plus a url as the same", () => {
    expect(
      isSameTitleAndContent(
        "make loading the page feel faster https://t.co/kw5abc",
        "make loading the page feel faster",
      ),
    ).toBe(true);
  });

  it("keeps a distinct title", () => {
    expect(
      isSameTitleAndContent("Screenlife - Wikipedia", "A short article body"),
    ).toBe(false);
  });
});
