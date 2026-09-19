import { describe, expect, it } from "vitest";
import { menuLabels } from "@/shared/test/menu-labels";
import { buildNewMenuItems, filterMenuItems } from "./spec";

describe("new menu spec", () => {
  it("orders create, import, connect, then tools", () => {
    const labels = menuLabels(buildNewMenuItems(["photoshop", "word"]));
    expect(labels).toEqual([
      "New Folder",
      "New Smart Folder",
      "New Tag",
      "New Tag Group",
      "New Note",
      "Photoshop Document",
      "Word Document",
      "Import Files",
      "Import Folders",
      "Import from Links",
      "Import from Clipboard",
      "Import Bookmarks",
      "Import Page Assets",
      "Import Pond Package",
      "Import Eagle Library",
      "Auto Import",
      "Watched Folder",
      "Auto Import Settings",
      "New Source",
      "Twitter",
      "Instagram",
      "Pinterest",
      "Are.na",
      "Cosmos",
      "TikTok",
      "YouTube",
      "Reddit",
      "Threads",
      "New Watch",
      "Twitter",
      "Instagram",
      "Pinterest",
      "Are.na",
      "Cosmos",
      "TikTok",
      "YouTube",
      "Find Duplicates",
      "Scan All",
      "Current List",
      "Selected",
      "Rescan Library",
      "Verify Integrity",
    ]);
    expect(labels.join(" ")).not.toContain("ArtStation");
    expect(labels.join(" ")).not.toContain("…");
    expect(labels).not.toContain("Create");
    expect(labels).not.toContain("Import");
    expect(labels).not.toContain("Connect");
    expect(labels).not.toContain("Tools");
    expect(
      buildNewMenuItems(["word"]).filter((item) => item.type === "separator"),
    ).toHaveLength(3);
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

  it("keeps group children when searching a leaf", () => {
    const labels = menuLabels(filterMenuItems(buildNewMenuItems([]), "eagle"));
    expect(labels).toEqual(["Import Eagle Library"]);
  });
});
