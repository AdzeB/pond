import { describe, expect, it } from "vitest";
import { descendantFolderIds, flattenFolderTree, sortFolderRows } from "./tree";

describe("folder tree", () => {
  it("keeps root folders at depth 0", () => {
    const rows = flattenFolderTree([
      { id: "a", parentId: null },
      { id: "b", parentId: null },
    ]);
    expect(rows.map(({ folder, depth }) => [folder.id, depth])).toEqual([
      ["a", 0],
      ["b", 0],
    ]);
  });

  it("nests children under their parent", () => {
    const rows = flattenFolderTree([
      { id: "parent", parentId: null },
      { id: "child", parentId: "parent" },
    ]);
    expect(rows.map(({ folder, depth }) => [folder.id, depth])).toEqual([
      ["parent", 0],
      ["child", 1],
    ]);
  });

  it("visits nested branches before later siblings", () => {
    const rows = flattenFolderTree([
      { id: "root", parentId: null },
      { id: "first", parentId: "root" },
      { id: "last", parentId: "root" },
      { id: "nested-first", parentId: "first" },
      { id: "nested-last", parentId: "last" },
    ]);
    expect(rows.map(({ folder, depth }) => [folder.id, depth])).toEqual([
      ["root", 0],
      ["first", 1],
      ["nested-first", 2],
      ["last", 1],
      ["nested-last", 2],
    ]);
  });

  it("keeps indentation beyond three levels", () => {
    const rows = flattenFolderTree([
      { id: "0", parentId: null },
      { id: "1", parentId: "0" },
      { id: "2", parentId: "1" },
      { id: "3", parentId: "2" },
      { id: "4", parentId: "3" },
    ]);
    expect(rows.at(-1)).toEqual({
      folder: { id: "4", parentId: "3" },
      depth: 4,
    });
  });

  it("hides descendants of collapsed folders", () => {
    const rows = flattenFolderTree(
      [
        { id: "root", parentId: null },
        { id: "child", parentId: "root" },
        { id: "nested", parentId: "child" },
      ],
      new Set(["root"]),
    );
    expect(rows.map(({ folder }) => folder.id)).toEqual(["root"]);
  });

  it("includes a folder and every nested descendant", () => {
    expect(
      descendantFolderIds("root", [
        { id: "root", parentId: null },
        { id: "child", parentId: "root" },
        { id: "nested", parentId: "child" },
        { id: "other", parentId: null },
      ]),
    ).toEqual(["root", "child", "nested"]);
  });

  it("sorts folder rows by title or newest date while preserving custom order", () => {
    const rows = [
      {
        id: "z",
        name: "Zulu",
        parentId: null,
        sortOrder: 0,
        createdAt: new Date("2025-01-01"),
      },
      {
        id: "a",
        name: "Alpha",
        parentId: null,
        sortOrder: 1,
        createdAt: new Date("2026-01-01"),
      },
    ];

    expect(sortFolderRows(rows, "manual").map((row) => row.id)).toEqual([
      "z",
      "a",
    ]);
    expect(sortFolderRows(rows, "title").map((row) => row.id)).toEqual([
      "a",
      "z",
    ]);
    expect(sortFolderRows(rows, "createdAt").map((row) => row.id)).toEqual([
      "a",
      "z",
    ]);
  });
});
