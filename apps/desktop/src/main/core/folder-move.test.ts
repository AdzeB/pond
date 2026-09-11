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
