import { expect, it } from "vitest";
import {
  FILE_MENU_AUTO_IMPORT_LABELS,
  FILE_MENU_CREATE_LABELS,
  FILE_MENU_DUPLICATES_LABELS,
  FILE_MENU_EXPORT_LABELS,
} from "./file-menu";

it("exposes Eagle File create and import rows", () => {
  expect(FILE_MENU_CREATE_LABELS).toEqual([
    "New Folder",
    "New Smart Folder",
    "New Smart Folder Group",
    "New Note",
    "Import Files",
    "Import Folders",
    "Import from Links",
    "Import Eagle Library",
    "Import Pond Package",
  ]);
  expect(FILE_MENU_AUTO_IMPORT_LABELS).toEqual(["Watched Folder"]);
  expect(FILE_MENU_DUPLICATES_LABELS).toEqual([
    "Scan All",
    "Current List",
    "Selected",
  ]);
  expect(FILE_MENU_EXPORT_LABELS).toEqual([
    "Export Files",
    "Export Converted Files",
    "Export Eagle Package",
    "Export Pond Package",
    "Export to CSV",
  ]);
});
