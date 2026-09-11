import { describe, expect, it } from "vitest";
import {
  FOLDER_DRAG_TYPE,
  folderDropKind,
  isFolderDrag,
  planFolderSidebarDrop,
} from "./folder-drop";

const travel = { id: "travel", parentId: null };
const tickets = { id: "tickets", parentId: "travel" };
const receipts = { id: "receipts", parentId: "travel" };
const shots = { id: "shots", parentId: null };
const folders = [travel, tickets, receipts, shots];

describe("folder sidebar drop", () => {
  it("recognizes a folder drag type case-insensitively", () => {
    expect(isFolderDrag([FOLDER_DRAG_TYPE])).toBe(true);
    expect(isFolderDrag(["APPLICATION/X-POND-FOLDER"])).toBe(true);
    expect(isFolderDrag(["text/plain"])).toBe(false);
  });

  it("treats the top and bottom of a row as reorder edges", () => {
    expect(folderDropKind(0, 28)).toBe("before");
    expect(folderDropKind(7, 28)).toBe("before");
    expect(folderDropKind(14, 28)).toBe("into");
    expect(folderDropKind(21, 28)).toBe("after");
    expect(folderDropKind(0, 0)).toBe("into");
  });

  it("nests a folder inside the drop target", () => {
    expect(planFolderSidebarDrop("shots", travel, "into", folders)).toEqual({
      id: "shots",
      parentId: "travel",
    });
  });

  it("rejects dropping a folder into itself or a descendant", () => {
    expect(planFolderSidebarDrop("travel", travel, "into", folders)).toBeNull();
    expect(
      planFolderSidebarDrop("travel", tickets, "into", folders),
    ).toBeNull();
    expect(
      planFolderSidebarDrop("travel", tickets, "before", folders),
    ).toBeNull();
  });

  it("reorders a folder before a sibling", () => {
    expect(planFolderSidebarDrop("shots", travel, "before", folders)).toEqual({
      id: "shots",
      parentId: null,
      beforeId: "travel",
    });
  });

  it("reorders a folder after a sibling, skipping a no-op", () => {
    expect(planFolderSidebarDrop("shots", travel, "after", folders)).toBeNull();
    expect(
      planFolderSidebarDrop("tickets", receipts, "after", folders),
    ).toEqual({ id: "tickets", parentId: "travel" });
  });
});
