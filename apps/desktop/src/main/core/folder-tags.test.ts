import { describe, expect, it } from "vitest";
import { inheritedFolderTags, planFolderAssignment } from "./folder-tags";

const folders = [
  { id: "root", parentId: null },
  { id: "child", parentId: "root" },
  { id: "other", parentId: null },
];
const rules = {
  root: { automaticTags: ["Work", "PRINT"] },
  child: { automaticTags: ["Print", "Posters"] },
  other: { automaticTags: ["Personal"] },
};
describe("automatic folder tags", () => {
  it("inherits every ancestor across multiple memberships and deduplicates names", () => {
    expect(inheritedFolderTags(["child", "other"], folders, rules)).toEqual([
      "Print",
      "Posters",
      "Work",
      "Personal",
    ]);
  });
  it("plans membership and additive tags together with exact Undo snapshots", () => {
    const txs = planFolderAssignment(
      { id: "save", tags: ["Favorite"] },
      ["other"],
      ["child"],
      inheritedFolderTags(["child"], folders, rules),
    );
    expect(txs.map((tx) => tx.model)).toEqual(["save_folder", "save"]);
    expect(txs[0]).toMatchObject({
      before: { folderIds: ["other"] },
      patch: { folderIds: ["child"] },
    });
    expect(txs[1]).toMatchObject({
      before: { tags: ["Favorite"] },
      patch: { tags: ["Favorite", "Print", "Posters", "Work"] },
    });
  });
  it("does not remove tags when membership is removed and can apply new rules to existing members", () => {
    expect(
      planFolderAssignment({ id: "save", tags: ["Work"] }, ["root"], [], []),
    ).toHaveLength(1);
    expect(
      planFolderAssignment(
        { id: "save", tags: ["Work"] },
        ["root"],
        ["root"],
        ["Work"],
      ),
    ).toEqual([]);
    expect(
      planFolderAssignment(
        { id: "save", tags: ["Work"] },
        ["root"],
        ["root"],
        ["Work", "New"],
      ),
    ).toMatchObject([{ model: "save", patch: { tags: ["Work", "New"] } }]);
  });
  it("rejects cycles and missing destinations before adding tags", () => {
    expect(() => inheritedFolderTags(["missing"], folders, rules)).toThrow(
      "no longer exists",
    );
    expect(() =>
      inheritedFolderTags(["root"], [{ id: "root", parentId: "root" }], rules),
    ).toThrow("cycle");
  });
});
