import { describe, expect, it } from "vitest";
import { flattenFolderTree } from "./tree";

describe("folder tree connectors", () => {
  it("does not connect separate root folders", () => {
    const rows = flattenFolderTree([
      { id: "a", parentId: null },
      { id: "b", parentId: null },
    ]);
    expect(rows.map(({ guides }) => guides)).toEqual([[], []]);
  });

  it("ends the connector at the only child", () => {
    const rows = flattenFolderTree([
      { id: "parent", parentId: null },
      { id: "child", parentId: "parent" },
    ]);
    expect(
      rows.map(({ depth, guides }) => ({
        depth,
        guides: guides.map((g) => g.continues),
      })),
    ).toEqual([
      { depth: 0, guides: [] },
      { depth: 1, guides: [false] },
    ]);
  });

  it("continues ancestor lines through descendants until the last sibling", () => {
    const rows = flattenFolderTree([
      { id: "root", parentId: null },
      { id: "first", parentId: "root" },
      { id: "last", parentId: "root" },
      { id: "nested-first", parentId: "first" },
      { id: "nested-last", parentId: "last" },
    ]);
    expect(
      rows.map(({ folder, guides }) => [
        folder.id,
        guides.map((g) => g.continues),
      ]),
    ).toEqual([
      ["root", []],
      ["first", [true]],
      ["nested-first", [true, false]],
      ["last", [false]],
      ["nested-last", [false, false]],
    ]);
  });

  it("keeps indentation and connectors beyond three levels", () => {
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
      guides: [
        { parentId: "0", continues: false },
        { parentId: "1", continues: false },
        { parentId: "2", continues: false },
        { parentId: "3", continues: false },
      ],
    });
  });
});
