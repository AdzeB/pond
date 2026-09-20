import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { folders } from "@/features/library/state/folders";
import {
  createFolderSidebarHarness,
  folder,
  folderList,
  pondQuery,
  sidebarCounts,
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
      "Duplicate",
      "Export",
      "Add to Other Library",
      "Customize Folder",
      "Remove Folder",
    ]) {
      expect(items.some((item) => item.includes(label))).toBe(true);
    }
    expect(items.some((item) => item === "Delete")).toBe(false);
    expect(document.body.textContent).toContain("Quick Access");
    expect(items.some((item) => item.includes("Sort By"))).toBe(false);
    expect(
      document.querySelector('[aria-label="Search folder operations"]'),
    ).not.toBeNull();
  });

  it("opens folder customization in a dialog", async () => {
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
    await act(async () => harness.menuItem("Customize Folder").click());
    const dialog = document.querySelector('[role="dialog"]');
    if (!(dialog instanceof HTMLElement))
      throw new Error("Missing customization dialog");
    expect(dialog?.textContent).toContain("Customize Folder");
    expect(dialog?.textContent).toContain(
      "Choose how this folder looks and add optional details.",
    );
    expect(dialog?.querySelector('button[aria-pressed="true"]')).not.toBeNull();

    const option = (label: string) => {
      const button = [...dialog.querySelectorAll("button")].find(
        (candidate) => candidate.textContent?.trim() === label,
      );
      if (!button) throw new Error(`Missing customization option: ${label}`);
      return button;
    };
    await act(async () => option("Album").click());
    await act(async () => option("Pink").click());
    const description = dialog.querySelector("textarea");
    const externalLink = dialog.querySelector('input[type="url"]');
    if (!(description instanceof HTMLTextAreaElement))
      throw new Error("Missing folder description");
    if (!(externalLink instanceof HTMLInputElement))
      throw new Error("Missing external link");
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(description, "Reference material");
      description.dispatchEvent(new InputEvent("input", { bubbles: true }));
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(externalLink, "https://example.com/project");
      externalLink.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    await act(async () => option("Save").click());

    expect(pondQuery).toHaveBeenCalledWith("folders.setColor", {
      id: "Shots",
      color: "pink",
    });
    expect(pondQuery).toHaveBeenCalledWith(
      "settings.setPrefs",
      expect.objectContaining({
        folderViews: expect.objectContaining({
          Shots: expect.objectContaining({ icon: "album" }),
        }),
      }),
    );
    expect(pondQuery).toHaveBeenCalledWith("folders.metadata.set", {
      folderId: "Shots",
      description: "Reference material",
      externalLink: "https://example.com/project",
    });
  });

  it("sorts the folder list from the Folders group header menu", async () => {
    folderList.current = [folder("Zulu"), folder("Alpha")];
    await folders.refresh();
    await harness.mount();

    expect(
      [...harness.host.querySelectorAll("button")]
        .map(harness.rowLabel)
        .filter((label) => label === "Alpha" || label === "Zulu"),
    ).toEqual(["Zulu", "Alpha"]);

    await act(async () => {
      harness.button("Folders").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    expect(harness.menuItem("Sort By")).toBeDefined();
    await act(async () => harness.menuItem("Sort By").click());
    await act(async () => harness.menuItem("Title").click());

    expect(
      [...harness.host.querySelectorAll("button")]
        .map(harness.rowLabel)
        .filter((label) => label === "Alpha" || label === "Zulu"),
    ).toEqual(["Alpha", "Zulu"]);
    expect(localStorage.getItem("pond:folder-list-sort")).toBe("title");
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
    await act(async () => {
      harness.menuItem("Remove Folder").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
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

  it("shows positive counts only at visible folder branch boundaries", async () => {
    folderList.current = [
      folder("Jil Sander"),
      folder("Runway Year", "Jil Sander"),
      folder("Autumn Winter", "Runway Year"),
      folder("Archive", "Jil Sander"),
      folder("Empty", "Jil Sander"),
    ];
    sidebarCounts.current = {
      library: 6006,
      uncategorized: 0,
      untagged: 0,
      trash: 0,
      folders: {
        "Jil Sander": 6006,
        "Runway Year": 206,
        "Autumn Winter": 206,
        Archive: 5800,
        Empty: 0,
      },
    };
    await folders.refresh();
    await harness.mount();

    expect(harness.button("Jil Sander").textContent).not.toContain("6,006");
    expect(harness.button("Runway Year").textContent).not.toContain("206");
    expect(harness.button("Autumn Winter").textContent).toContain("206");
    expect(harness.button("Archive").textContent).toContain("5,800");
    expect(harness.button("Empty").textContent).toBe("Empty");

    await act(async () => harness.iconButton("Collapse Runway Year").click());
    expect(harness.button("Runway Year").textContent).toContain("206");
    expect(() => harness.button("Autumn Winter")).toThrow(
      "Missing sidebar button: Autumn Winter",
    );
    expect(harness.button("Jil Sander").textContent).not.toContain("6,006");

    await act(async () => harness.iconButton("Collapse Jil Sander").click());
    expect(harness.button("Jil Sander").textContent).toContain("6,006");
    expect(() => harness.button("Runway Year")).toThrow(
      "Missing sidebar button: Runway Year",
    );
  });
});
