import { describe, expect, it } from "vitest";
import { menuLabels, menuLabelsWithoutIcons } from "@/shared/test/menu-labels";
import { buildNewMenuItems, filterMenuItems } from "./spec";

describe("new menu spec", () => {
  it("gives every searchable action an icon", () => {
    expect(menuLabelsWithoutIcons(buildNewMenuItems(["word"]))).toEqual([]);
  });

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
      "Capture Screenshot",
      "Import Files",
      "Import Folders",
      "Import from Links",
      "Import from Clipboard",
      "Import Bookmarks",
      "Import Page Assets",
      "Import Eagle Package",
      "Import Pond Package",
      "Import Eagle Library",
      "Import Legacy Library",
      "Import ArtStation Export",
      "Import Huaban Export",
      "Import Pixave Export",
      "Import Inboard Export",
      "Auto Import",
      "Watched Folder",
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
      "Repair Library",
      "Repair Thumbnails",
      "Repair Physical File Names",
      "Repair Invalid Content",
      "Repair Save Metadata",
      "Export Debug Report",
    ]);
    expect(labels.join(" ")).toContain("ArtStation");
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
    expect(labels).toEqual(["Import Eagle Package", "Import Eagle Library"]);
  });
});
