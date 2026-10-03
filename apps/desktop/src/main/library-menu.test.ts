import { expect, it } from "vitest";
import { LIBRARY_MENU_LABELS } from "./library-menu";

it("exposes create, switch, backup, restore, merge, and verify", () => {
  expect(LIBRARY_MENU_LABELS).toEqual([
    "New Library",
    "Open Library",
    "Reveal Library in Finder",
    "Move Library",
    "Rescan Library",
    "Reload Library",
    "Verify Integrity",
    "Backup",
    "Restore",
    "Merge Library",
    "Empty Trash",
    "Restore All from Trash",
    "Clear History",
  ]);
});
