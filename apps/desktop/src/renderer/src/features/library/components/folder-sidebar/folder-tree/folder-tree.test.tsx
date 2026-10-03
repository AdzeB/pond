import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { getViewState } from "@/features/library/state/view-store";
import {
  createFolderSidebarHarness,
  folder,
  folderList,
  pondQuery,
  sidebarCounts,
} from "../test-harness";

describe("folder sidebar tree", () => {
  const harness = createFolderSidebarHarness();

  beforeEach(() => harness.setup());
  afterEach(() => harness.cleanup());

  it("starts inline naming from the shared folder state", async () => {
    folderList.current = [folder("Untitled")];
    await folders.refresh();
    await harness.mount();
    await act(async () => folders.startEditing("Untitled"));
    const input = harness.host.querySelector<HTMLInputElement>(
      'input[aria-label="Folder name"]',
    );
    expect(input?.value).toBe("Untitled");
    expect(input?.selectionStart).toBe(0);
    expect(input?.selectionEnd).toBe("Untitled".length);
  });

  it("selects folder ranges, browses their union, and preserves a batch context menu", async () => {
    folderList.current = [folder("Alpha"), folder("Beta"), folder("Charlie")];
    await folders.refresh();
    await harness.mount();
    await act(async () => harness.button("Alpha").click());
    await act(async () =>
      harness
        .button("Charlie")
        .dispatchEvent(
          new MouseEvent("click", { bubbles: true, shiftKey: true }),
        ),
    );
    expect(
      [
        ...harness.host.querySelectorAll(
          '[role="treeitem"][aria-selected="true"]',
        ),
      ].map((row) => row.getAttribute("data-tree-id")),
    ).toEqual(["Alpha", "Beta", "Charlie"]);
    expect(
      harness.host.querySelectorAll('[role="treeitem"][aria-current="page"]'),
    ).toHaveLength(0);
    expect(getViewState().query.rules).toEqual([
      {
        field: "folder",
        operator: "some",
        value: ["Alpha", "Beta", "Charlie"],
      },
    ]);
    await act(async () =>
      harness.button("Beta").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
        }),
      ),
    );
    expect(harness.menuItem("Move 3 Folders")).toBeDefined();
    expect(harness.menuItem("Batch Rename Folders")).toBeDefined();
  });

  it("supports ranges and bulk context operations in Quick Access", async () => {
    folderList.current = [folder("Quick Alpha"), folder("Quick Beta")];
    await folders.refresh();
    await saveFolderPresentation("Quick Alpha", { quickAccess: true });
    await saveFolderPresentation("Quick Beta", { quickAccess: true });
    await harness.mount();
    await act(async () => harness.button("Quick Alpha").click());
    await act(async () =>
      harness
        .button("Quick Beta")
        .dispatchEvent(
          new MouseEvent("click", { bubbles: true, shiftKey: true }),
        ),
    );
    const quickTree = harness.host.querySelector(
      '[role="tree"][aria-label="Quick Access"]',
    );
    expect(quickTree?.querySelectorAll('[aria-selected="true"]')).toHaveLength(
      2,
    );
    await act(async () =>
      harness.button("Quick Alpha").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
        }),
      ),
    );
    expect(harness.menuItem("Open 2 Selected Items")).toBeDefined();
  });

  it("keeps collapsed folder content out of the keyboard tree", async () => {
    folderList.current = [folder("Alpha")];
    await folders.refresh();
    await harness.mount();
    await act(async () => harness.button("Folders").click());
    const tree = harness.host.querySelector(
      '[role="tree"][aria-label="Folders"]',
    );
    expect(tree?.hasAttribute("inert")).toBe(true);
    expect(tree?.getAttribute("aria-hidden")).toBe("true");
  });

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
    expect(items.some((item) => item.includes("Sort By"))).toBe(true);
    expect(items.some((item) => item.includes("Customize Folder"))).toBe(true);
    expect(items.some((item) => item.includes("Icon"))).toBe(true);
    expect(items.some((item) => item.includes("Color"))).toBe(true);
    expect(
      document.querySelector('[aria-label="Search folder operations"]'),
    ).not.toBeNull();
  });

  it("opens the shared visibility menu from a built-in row", async () => {
    await harness.mount();
    await act(async () => {
      harness.button("All").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    for (const label of ["Visibility", "Badge", "Customize Sidebar"]) {
      expect(harness.menuItem(label)).toBeDefined();
    }
  });

  it("opens sidebar customization from the Library label", async () => {
    await harness.mount();
    const label = [...harness.host.querySelectorAll("*")].find(
      (node) => node.children.length === 0 && node.textContent === "Library",
    );
    if (!(label instanceof HTMLElement))
      throw new Error("Missing Library label");
    await act(async () => {
      label.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    await act(async () => harness.menuItem("Customize Sidebar").click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Customize Sidebar");
    expect(dialog?.textContent).toContain("All");
  });

  it("makes visible built-in destinations directly sortable", async () => {
    await harness.mount();
    expect(
      [...harness.host.querySelectorAll("[data-sidebar-sortable]")].map((row) =>
        row.getAttribute("data-sidebar-sortable"),
      ),
    ).toEqual([
      "all",
      "uncategorized",
      "assistant",
      "untagged",
      "recentlyUsed",
      "tags",
      "random",
      "trash",
      "downloads",
      "sources",
    ]);
  });

  it("hands a dropped sidebar row to its new layout without snap-back motion", async () => {
    await harness.mount();
    const rows = [
      ...harness.host.querySelectorAll<HTMLElement>("[data-sidebar-sortable]"),
    ];
    for (const row of rows) {
      vi.spyOn(row, "getBoundingClientRect").mockImplementation(() => {
        const currentRows = [
          ...harness.host.querySelectorAll<HTMLElement>(
            "[data-sidebar-sortable]",
          ),
        ];
        const index = currentRows.indexOf(row);
        return DOMRect.fromRect({
          x: 0,
          y: index * 40,
          width: 260,
          height: 40,
        });
      });
    }
    const all = harness.button("All");
    const allRow = all.closest<HTMLElement>("[data-sidebar-sortable]");
    expect(allRow).not.toBeNull();
    const transitions: string[] = [];
    const observer = new MutationObserver(() => {
      transitions.push(allRow?.style.transition ?? "");
    });
    observer.observe(allRow as HTMLElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    const pointer = (type: string, clientY: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        button: 0,
        cancelable: true,
        clientX: 20,
        clientY,
      });
      Object.defineProperties(event, {
        isPrimary: { value: true },
        pointerId: { value: 1 },
        pointerType: { value: "mouse" },
      });
      return event;
    };

    await act(async () => {
      all.dispatchEvent(pointer("pointerdown", 20));
    });
    await act(async () => {
      document.dispatchEvent(pointer("pointermove", 30));
    });
    expect(allRow?.hasAttribute("data-dragging")).toBe(true);
    await act(async () => {
      document.dispatchEvent(pointer("pointermove", 180));
    });
    expect(allRow?.style.transform).toContain("120");
    await act(async () => {
      document.dispatchEvent(pointer("pointerup", 180));
    });
    observer.disconnect();

    expect(
      [...harness.host.querySelectorAll("[data-sidebar-sortable]")].map((row) =>
        row.getAttribute("data-sidebar-sortable"),
      ),
    ).toEqual([
      "uncategorized",
      "assistant",
      "untagged",
      "all",
      "recentlyUsed",
      "tags",
      "random",
      "trash",
      "downloads",
      "sources",
    ]);
    expect(transitions).toContain("transform 0ms linear");
  });

  it("opens Quick Access folder operations from its row", async () => {
    folderList.current = [folder("Shots")];
    await folders.refresh();
    await saveFolderPresentation("Shots", {
      quickAccess: true,
      quickAccessOrder: 0,
    });
    await harness.mount();
    const rows = [...harness.host.querySelectorAll("button")].filter(
      (button) => button.textContent?.replace(/[\d,]+$/, "").trim() === "Shots",
    );
    const quickRow = rows[0];
    if (!quickRow) throw new Error("Missing Quick Access folder");
    await act(async () => {
      quickRow.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    expect(harness.menuItem("Remove from Quick Access")).toBeDefined();
    expect(harness.menuItem("Move Up")).toBeDefined();
    expect(harness.menuItem("Move Down")).toBeDefined();
    await saveFolderPresentation("Shots", { quickAccess: false });
  });

  it("opens Recently Used and Random destinations", async () => {
    const router = await harness.mount();
    await act(async () => harness.button("Recently Used").click());
    expect(router.state.location.pathname).toBe("/recents");
    expect(libraryChrome.getState().nav).toEqual({ kind: "recents" });
    await act(async () => harness.button("Random").click());
    expect(router.state.location.pathname).toBe("/");
    expect(libraryChrome.getState().nav).toEqual({ kind: "random" });
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

  it("opens folder operations from the disclosure button", async () => {
    folderList.current = [folder("Travel"), folder("Tickets", "Travel")];
    await folders.refresh();
    await harness.mount();
    await act(async () => {
      harness.iconButton("Collapse Travel").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    expect(harness.menuItem("Customize Folder")).toBeDefined();
    expect(harness.menuItem("Sort By")).toBeDefined();
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
