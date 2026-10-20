import { describe, expect, it } from "vitest";
import { folderRows, rankTags, searchFolders } from "./library-targets";
import type { Folder, Tag } from "./messaging";

const folder = (id: string, parentId: string | null = null): Folder => ({
  id,
  name: id.toUpperCase(),
  parentId,
  color: null,
});

const tag = (name: string, extra: Partial<Tag> = {}): Tag => ({
  name,
  starred: false,
  usageCount: 0,
  lastUsedAt: null,
  ...extra,
});

describe("folderRows", () => {
  it("nests children under their parent", () => {
    const rows = folderRows([folder("b", "a"), folder("a"), folder("c")]);
    expect(rows.map((row) => [row.folder.id, row.depth, row.path])).toEqual([
      ["a", 0, []],
      ["b", 1, ["A"]],
      ["c", 0, []],
    ]);
  });

  it("treats a missing parent as a root", () => {
    const rows = folderRows([folder("b", "gone")]);
    expect(rows.map((row) => row.depth)).toEqual([0]);
  });

  it("keeps every folder from a parent cycle exactly once", () => {
    const rows = folderRows([folder("a", "b"), folder("b", "a")]);
    expect(rows.map((row) => row.folder.id).toSorted()).toEqual(["a", "b"]);
  });

  it("filters by name", () => {
    const rows = folderRows([folder("art"), folder("bar", "art")]);
    expect(searchFolders(rows, " AR ").map((row) => row.folder.id)).toEqual([
      "art",
      "bar",
    ]);
    expect(searchFolders(rows, "bar").map((row) => row.path)).toEqual([
      ["ART"],
    ]);
  });
});

describe("rankTags", () => {
  const tags = [
    tag("print", { usageCount: 9 }),
    tag("design", { usageCount: 2 }),
    tag("type", { starred: true }),
    tag("web", { usageCount: 5 }),
  ];

  it("puts starred, then recent, then frequent tags first", () => {
    expect(rankTags(tags, ["design"], "", 10)).toEqual([
      "type",
      "design",
      "print",
      "web",
    ]);
  });

  it("puts prefix matches ahead of other matches", () => {
    expect(rankTags([tag("webdesign"), tag("design")], [], "des", 10)).toEqual([
      "design",
      "webdesign",
    ]);
  });

  it("caps the list", () => {
    expect(rankTags(tags, [], "", 2)).toHaveLength(2);
  });
});
