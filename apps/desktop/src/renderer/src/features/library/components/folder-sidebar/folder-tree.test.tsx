import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { folders } from "@/features/library/state/folders";
import {
  createFolderSidebarHarness,
  folder,
  folderList,
  pondQuery,
} from "./test-harness";

describe("folder sidebar tree", () => {
  const harness = createFolderSidebarHarness();

  beforeEach(() => harness.setup());
  afterEach(() => harness.cleanup());

  it("opens a searchable folder context menu with Eagle operations", async () => {
    folderList.current = [folder("Shots")];
    await folders.refresh();
    await harness.mount();
    await act(async () => {
      harness.button("Shots").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    const items = [...document.querySelectorAll('[role="menuitem"]')].map(
      (node) => node.textContent?.trim() ?? "",
    );
    for (const label of [
      "New Folder",
      "New Subfolder",
      "Move Folder",
      "Rename",
      "Set Auto-Tag",
      "Sort By",
      "Duplicate",
      "Export",
      "Add to Other Library",
      "Change Icon",
      "Remove Folder",
    ]) {
      expect(items.some((item) => item.includes(label))).toBe(true);
    }
    expect(items.some((item) => item === "Delete")).toBe(false);
    expect(items.some((item) => item.includes("Password"))).toBe(false);
    expect(
      document.querySelector('[aria-label="Search folder operations"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[aria-label="Folder Color"]'),
    ).not.toBeNull();
  });

  it("opens the removal confirmation and deletes the folder", async () => {
    folderList.current = [folder("Shots")];
    await folders.refresh();
    await harness.mount();
    await act(async () => {
      harness.button("Shots").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    await act(async () => harness.menuItem("Remove Folder").click());
    const checkbox = document.querySelector('[role="checkbox"]');
    if (!(checkbox instanceof HTMLElement))
      throw new Error("Missing Trash checkbox");
    await act(async () => checkbox.click());
    const remove = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Remove",
    );
    expect(remove).toBeDefined();
    await act(async () => remove?.click());
    expect(pondQuery).toHaveBeenCalledWith("folders.delete", {
      id: "Shots",
      trashContainedSaves: true,
    });
  });

  it("places folder carets beside the folder icon and collapses nested rows", async () => {
    folderList.current = [
      folder("Travel"),
      folder("Tickets", "Travel"),
      folder("Receipts", "Travel"),
    ];
    await folders.refresh();
    await harness.mount();
    const toggle = harness.iconButton("Collapse Travel");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(harness.button("Travel").contains(toggle)).toBe(false);
    expect(harness.button("Tickets")).toBeDefined();
    expect(harness.button("Receipts")).toBeDefined();
    expect(() => harness.iconButton("Collapse Tickets")).toThrow(
      "Missing icon button: Collapse Tickets",
    );
    await act(async () => toggle.click());
    expect(
      harness.iconButton("Expand Travel").getAttribute("aria-expanded"),
    ).toBe("false");
    expect(() => harness.button("Tickets")).toThrow(
      "Missing sidebar button: Tickets",
    );
    expect(() => harness.button("Receipts")).toThrow(
      "Missing sidebar button: Receipts",
    );
  });
});
