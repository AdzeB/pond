// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildNewMenuItems, filterMenuItems, menuLabels } from "./spec";

describe("new menu spec", () => {
  it("follows Eagle order then Pond extras", () => {
    const labels = menuLabels(buildNewMenuItems(["photoshop", "word"]));
    expect(labels).toEqual([
      "New Folder",
      "New Smart Folder",
      "Import Files",
      "Import Folders",
      "Import from Links",
      "Import Pond Package",
      "Auto Import",
      "Watched Folder",
      "Auto Import Settings",
      "Find Duplicates",
      "Scan All",
      "Current List",
      "Selected",
      "New Note",
      "Photoshop Document",
      "Word Document",
      "Pinterest",
      "New Tag",
      "New Tag Group",
      "Import from Clipboard",
      "Import Bookmarks",
      "Import Page Assets",
      "Import Eagle Library",
      "Connect a Source",
      "Watch Account",
    ]);
    expect(labels.join(" ")).not.toContain("ArtStation");
    expect(labels.join(" ")).not.toContain("…");
  });

  it("hides document types that are not installed", () => {
    expect(menuLabels(buildNewMenuItems([])).join(" ")).not.toContain(
      "Photoshop",
    );
  });

  it("filters nested actions by search", () => {
    const labels = menuLabels(
      filterMenuItems(buildNewMenuItems(["word"]), "scan all"),
    );
    expect(labels).toEqual(["Find Duplicates · Scan All"]);
  });
});
