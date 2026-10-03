import { describe, expect, it } from "vitest";
import { planFolderBatchMove, planFolderMove } from "./folder-move";

describe("folder moves", () => {
  const rows = [
    { id: "root", parentId: null, sortOrder: 0 },
    { id: "child", parentId: "root", sortOrder: 0 },
    { id: "sibling", parentId: null, sortOrder: 1 },
  ];
  it("rejects cycles and stale targets", () => {
    expect(() => planFolderMove(rows, "root", "child")).toThrow("itself");
    expect(() => planFolderMove(rows, "child", "missing")).toThrow(
      "no longer exists",
    );
  });
  it("moves a child before a root sibling with stable sibling ordering", () => {
    expect(planFolderMove(rows, "child", null, "sibling")).toEqual([
      { id: "child", parentId: null, sortOrder: 1 },
      { id: "sibling", parentId: null, sortOrder: 2 },
    ]);
  });
});

it("moves selected roots together while preserving selected descendants inside their parent", () => {
  const rows = [
    { id: "a", parentId: null, sortOrder: 0 },
    { id: "child", parentId: "a", sortOrder: 0 },
    { id: "b", parentId: null, sortOrder: 1 },
    { id: "target", parentId: null, sortOrder: 2 },
  ];
  const patches = planFolderBatchMove(rows, ["a", "child", "b"], "target");
  expect(patches).toEqual([
    { id: "a", parentId: "target", sortOrder: 0 },
    { id: "b", parentId: "target", sortOrder: 1 },
  ]);
  expect(() => planFolderBatchMove(rows, ["a", "b"], "child")).toThrow(
    "itself",
  );
});

it("reorders a selected batch before an existing sibling without reversing it", () => {
  const rows = ["a", "b", "c", "d"].map((id, sortOrder) => ({
    id,
    parentId: null,
    sortOrder,
  }));
  const patches = new Map(
    planFolderBatchMove(rows, ["c", "d"], null, "a").map((row) => [
      row.id,
      row,
    ]),
  );
  expect(
    rows
      .map((row) => patches.get(row.id) ?? row)
      .toSorted((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => row.id),
  ).toEqual(["c", "d", "a", "b"]);
});
