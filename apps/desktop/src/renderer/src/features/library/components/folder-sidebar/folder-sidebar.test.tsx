import { Dialog } from "@pond/ui";
// @vitest-environment jsdom

import { PrefsSchema } from "@pond/schema";
import type { Folder, SavedView } from "@pond/schema/db";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartFolderContext } from "@/features/library/components/smart-folders/smart-folders";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { savedViews } from "@/features/library/state/saved-views";
import { selection } from "@/features/library/state/selection";
import {
  getViewState,
  resetFilters,
  updateLocalFilters,
} from "@/features/library/state/view-store";
import { setAppRouter } from "@/shared/lib/app-router";
import { FolderSidebar } from "./folder-sidebar";

const pondQuery = vi.fn(async (name: string) => {
  if (name === "saves.sidebarCounts")
    return { library: 0, uncategorized: 0, untagged: 0, trash: 0, folders: {} };
  if (name === "savedViews.list") return savedViewList.current;
  if (name === "accounts.list") return { accounts: [] };
  if (name === "watches.list") return { watches: [] };
  if (name === "tags.list") return [];
  if (name === "folders.list") return folderList.current;
  if (name === "folders.memberships") return [];
  if (name === "settings.getPrefs") return PrefsSchema.parse({});
  return { ok: true };
});
interface SavedViewFixtures {
  current: SavedView[];
}
const savedViewList: SavedViewFixtures = { current: [] };
const folderList: { current: Folder[] } = { current: [] };

function folder(name: string, parentId: string | null = null): Folder {
  return {
    id: name,
    name,
    parentId,
    color: null,
    sortOrder: 0,
    createdAt: new Date(),
  };
}

describe("folder sidebar", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    libraryChrome.setNav({ kind: "all" });
    resetFilters();
    savedViewList.current = [];
    folderList.current = [];
    pondQuery.mockClear();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("pond", {
      query: pondQuery,
      onSyncAction: () => () => {},
      onSaveUpdated: () => () => {},
      onSyncStatus: () => () => {},
    });
    await folders.refresh();
    await savedViews.refresh();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    selection.clear();
    vi.unstubAllGlobals();
  });

  function rowLabel(node: Element) {
    return node.textContent?.replace(/[\d,]+$/, "").trim() ?? "";
  }

  function button(label: string) {
    const match = [...host.querySelectorAll("button")].find(
      (node) => rowLabel(node) === label,
    );
    if (!match) throw new Error(`Missing sidebar button: ${label}`);
    return match;
  }

  function iconButton(label: string) {
    const match = host.querySelector(`[aria-label="${label}"]`);
    if (!(match instanceof HTMLElement)) {
      throw new Error(`Missing icon button: ${label}`);
    }
    return match;
  }

  async function mount(path = "/") {
    const rootRoute = createRootRoute({ component: FolderSidebar });
    const children = [
      "/",
      "/sources",
      "/tags",
      "/assistant",
      "/untagged",
      "/downloads",
    ].map((path) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => null,
      }),
    );
    const router = createRouter({
      routeTree: rootRoute.addChildren(children),
      history: createMemoryHistory({ initialEntries: [path] }),
    });
    setAppRouter(router);
    await act(async () => {
      await router.load();
      root.render(
        <>
          <RouterProvider router={router} />
          <SmartFolderContext />
          <Dialog.Host />
        </>,
      );
    });
    return router;
  }

  it("opens Sources from the sidebar with an outline icon", async () => {
    const router = await mount();
    const sources = button("Sources");
    expect(sources.querySelector('[stroke="currentColor"]')).not.toBeNull();
    expect(sources.querySelector('[fill="currentColor"]')).toBeNull();
    await act(async () => sources.click());
    expect(router.state.location.pathname).toBe("/sources");
    expect(libraryChrome.getState().nav).toEqual({ kind: "sources" });
    expect(button("Sources").getAttribute("aria-current")).toBe("page");
  });

  it("opens Uncategorized from the sidebar", async () => {
    const router = await mount();
    await act(async () => button("Uncategorized").click());
    expect(router.state.location.pathname).toBe("/");
    expect(libraryChrome.getState().nav).toEqual({ kind: "uncategorized" });
    expect(button("Uncategorized").getAttribute("aria-current")).toBe("page");
    expect(button("All").getAttribute("aria-current")).toBeNull();
  });

  it("opens Untagged from the sidebar", async () => {
    const router = await mount();
    await act(async () => button("Untagged").click());
    expect(router.state.location.pathname).toBe("/untagged");
    expect(button("Untagged").getAttribute("aria-current")).toBe("page");
    expect(button("All").getAttribute("aria-current")).toBeNull();
  });

  it("opens a searchable folder context menu with Eagle operations", async () => {
    folderList.current = [folder("Shots")];
    await folders.refresh();
    await mount();
    await act(async () => {
      button("Shots").dispatchEvent(
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

  it("shows counts on library destinations", async () => {
    await mount();
    expect(button("All").textContent).toContain("0");
    expect(button("Uncategorized").textContent).toContain("0");
    expect(button("Untagged").textContent).toContain("0");
    expect(button("Tags").textContent).toContain("0");
    expect(button("Trash").textContent).toContain("0");
    expect(button("Downloads").textContent).toContain("0");
    expect(button("Sources").textContent).toContain("0");
  });

  it("opens Tags from the sidebar with an outline icon", async () => {
    const router = await mount();
    const tags = button("Tags");
    expect(tags.querySelector('[stroke="currentColor"]')).not.toBeNull();
    expect(tags.querySelector('path[fill="currentColor"]')).toBeNull();
    await act(async () => tags.click());
    expect(router.state.location.pathname).toBe("/tags");
    expect(tags.getAttribute("aria-current")).toBe("page");
    expect(button("All").getAttribute("aria-current")).toBeNull();
  });

  it.each([
    ["/sources", "Sources"],
    ["/tags", "Tags"],
    ["/untagged", "Untagged"],
  ])("highlights only %s when opened directly", async (path, label) => {
    await mount(path);
    expect(host.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(rowLabel(host.querySelector('[aria-current="page"]') ?? host)).toBe(
      label,
    );
  });

  it.each([
    ["/sources", "Sources"],
    ["/tags", "Tags"],
    ["/untagged", "Untagged"],
  ])("updates the %s highlight across route history", async (path, label) => {
    const router = await mount(path);
    await act(async () => button("All").click());
    expect(router.state.location.pathname).toBe("/");
    expect(button("All").getAttribute("aria-current")).toBe("page");
    await act(async () => router.history.back());
    expect(router.state.location.pathname).toBe(path);
    expect(button(label).getAttribute("aria-current")).toBe("page");
    expect(button("All").getAttribute("aria-current")).toBeNull();
    await act(async () => button("Downloads").click());
    expect(button(label).getAttribute("aria-current")).toBeNull();
    expect(button("Downloads").getAttribute("aria-current")).toBe("page");
  });

  it("groups library destinations before downloads", async () => {
    await mount();
    const labels = [...host.querySelectorAll("button")].map(rowLabel);
    const library = labels.indexOf("All");
    const uncategorized = labels.indexOf("Uncategorized");
    const untagged = labels.indexOf("Untagged");
    const tags = labels.indexOf("Tags");
    const trash = labels.indexOf("Trash");
    const downloads = labels.indexOf("Downloads");
    const sources = labels.indexOf("Sources");
    expect(library).toBeLessThan(uncategorized);
    expect(uncategorized).toBeLessThan(untagged);
    expect(untagged).toBeLessThan(tags);
    expect(tags).toBeLessThan(trash);
    expect(trash).toBeLessThan(downloads);
    expect(downloads).toBeLessThan(sources);
  });

  it("does not collapse library and downloads groups", async () => {
    await mount();
    const toggles = [...host.querySelectorAll("button[aria-expanded]")].map(
      (node) => node.textContent?.trim(),
    );
    expect(toggles).toContain("Smart Folders");
    expect(toggles).toContain("Folders");
    expect(toggles).not.toContain("Library");
    expect(toggles).not.toContain("Downloads");
  });

  it("places folder carets beside the folder icon and collapses nested rows", async () => {
    folderList.current = [
      folder("Travel"),
      folder("Tickets", "Travel"),
      folder("Receipts", "Travel"),
    ];
    await folders.refresh();
    await mount();
    const toggle = iconButton("Collapse Travel");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(button("Travel").contains(toggle)).toBe(false);
    expect(button("Tickets")).toBeDefined();
    expect(button("Receipts")).toBeDefined();
    expect(() => iconButton("Collapse Tickets")).toThrow(
      "Missing icon button: Collapse Tickets",
    );
    await act(async () => toggle.click());
    expect(iconButton("Expand Travel").getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(() => button("Tickets")).toThrow("Missing sidebar button: Tickets");
    expect(() => button("Receipts")).toThrow(
      "Missing sidebar button: Receipts",
    );
  });

  async function mountUnreadView() {
    savedViewList.current = [
      {
        id: "view-1",
        name: "Unread",
        kind: "saved_view",
        parentId: null,
        query: { combinator: "and", rules: [] },
        question: null,
        sortKey: "savedAt",
        sortDir: "desc",
        layout: "waterfall",
        sortOrder: 0,
        createdAt: new Date(),
      },
    ];
    await savedViews.refresh();
    await mount();
  }

  async function confirmDelete() {
    const remove = [...document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent?.trim() === "Delete",
    );
    if (!(remove instanceof HTMLElement)) throw new Error("Missing Delete");
    await act(async () => remove.click());
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain("Delete Saved View");
    const confirmButton = [...(dialog?.querySelectorAll("button") ?? [])].find(
      (node) => node.textContent === "Delete",
    );
    if (!confirmButton) throw new Error("Missing delete confirmation");
    await act(async () => confirmButton.click());
    expect(pondQuery).toHaveBeenCalledWith("savedViews.delete", {
      id: "view-1",
    });
    expect(pondQuery).toHaveBeenCalledWith("savedViews.list", {});
  }

  it("renames a saved view inline from the hover menu", async () => {
    await mountUnreadView();
    const more = host.querySelector('[aria-label="More Actions for Unread"]');
    if (!(more instanceof HTMLElement)) throw new Error("Missing More Actions");
    await act(async () => more.click());
    await act(async () => menuItem("Rename").click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    const input = host.querySelector('input[aria-label="Saved View name"]');
    if (!(input instanceof HTMLInputElement))
      throw new Error("Missing inline rename");
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("Unread");
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    await act(async () => {
      setter?.call(input, "Later");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(pondQuery).toHaveBeenCalledWith("savedViews.rename", {
      id: "view-1",
      name: "Later",
    });
  });

  it("deletes a saved view from the hover menu", async () => {
    await mountUnreadView();
    const more = host.querySelector('[aria-label="More Actions for Unread"]');
    if (!(more instanceof HTMLElement)) throw new Error("Missing More Actions");
    await act(async () => more.click());
    const rename = [...document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent?.trim() === "Rename",
    );
    const remove = [...document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent?.trim() === "Delete",
    );
    expect(rename?.querySelector("svg")).not.toBeNull();
    expect(remove?.querySelector("svg")).not.toBeNull();
    await confirmDelete();
  });

  it("deletes a saved view from the context menu", async () => {
    await mountUnreadView();
    await act(async () => {
      button("Unread").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    await confirmDelete();
  });

  function entry(
    id: string,
    kind: SavedView["kind"],
    parentId: string | null = null,
  ): SavedView {
    return {
      id,
      name: id,
      kind,
      parentId,
      query: { combinator: "and", rules: [] },
      question: null,
      sortKey: "savedAt",
      sortDir: "desc",
      layout: "waterfall",
      sortOrder: 0,
      createdAt: new Date(),
    };
  }

  function menuItem(label: string) {
    const node = [...document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent?.trim() === label,
    );
    if (!(node instanceof HTMLElement))
      throw new Error(`Missing menu item: ${label}`);
    return node;
  }

  it.each([
    ["New Smart Folder", "smart_folder"],
    ["New Group", "group"],
    ["New Saved View", "saved_view"],
  ] as const)("creates and selects %s from Smart Folders", async (label, kind) => {
    await mount();
    await act(async () =>
      iconButton("New Smart Folder, Group, or Saved View").click(),
    );
    expect(menuItem("New Smart Folder")).toBeDefined();
    expect(menuItem("New Group")).toBeDefined();
    expect(menuItem("New Saved View")).toBeDefined();
    await act(async () => menuItem(label).click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain(label);
    const nameInput = dialog?.querySelector("input");
    if (!nameInput) throw new Error("Missing name input");
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    await act(async () => {
      setter?.call(nameInput, "Untitled");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      const ruleValue = dialog?.querySelector('[aria-label="Name Value"]');
      if (ruleValue instanceof HTMLInputElement) {
        setter?.call(ruleValue, "qa");
        ruleValue.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    const create = [...(dialog?.querySelectorAll("button") ?? [])].find(
      (node) => node.textContent === "Create",
    );
    if (!create) throw new Error("Missing Create button");
    pondQuery.mockImplementationOnce(async () => {
      savedViewList.current = [{ ...entry("created", kind), name: "Untitled" }];
      return { ok: true, id: "created" };
    });
    await act(async () => create.click());
    expect(pondQuery).toHaveBeenCalledWith(
      "savedViews.create",
      expect.objectContaining({ kind, parentId: null, name: "Untitled" }),
    );
    expect(button("Untitled").getAttribute("aria-current")).toBe("page");
    expect(button("All").getAttribute("aria-current")).toBeNull();
    expect(getViewState().activeViewId).toBe("created");
  });

  it("nests entries in groups and collapses their keyboard targets", async () => {
    savedViewList.current = [
      entry("Branding", "group"),
      entry("Images", "smart_folder", "Branding"),
      entry("Review", "saved_view", "Branding"),
    ];
    await savedViews.refresh();
    await mount();
    await act(async () => button("Images").click());
    expect(button("Images").getAttribute("aria-current")).toBe("page");
    expect(button("All").getAttribute("aria-current")).toBeNull();
    await act(async () => iconButton("Collapse Branding").click());
    expect(iconButton("Expand Branding").getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(button("Images").closest("[inert]")).not.toBeNull();
    expect(button("Review").closest("[inert]")).not.toBeNull();
    await act(async () => iconButton("Expand Branding").click());
    expect(button("Images").closest("[inert]")).toBeNull();
    await act(async () => iconButton("More Actions for Branding").click());
    expect(menuItem("New Smart Folder")).toBeDefined();
    expect(menuItem("New Group")).toBeDefined();
    expect(menuItem("New Saved View")).toBeDefined();
  });

  it("leaves the smart folder scope when navigating to another destination", async () => {
    await mountUnreadView();
    await act(async () => button("Unread").click());
    await act(async () => button("Sources").click());
    expect(getViewState().activeViewId).toBeNull();
    expect(button("Unread").getAttribute("aria-current")).toBeNull();
  });

  it("saves child filters separately from its parent conditions", async () => {
    const group = entry("Branding", "group");
    group.query = {
      combinator: "and",
      rules: [{ field: "tags", operator: "some", value: ["branding"] }],
    };
    savedViewList.current = [group, entry("Images", "smart_folder", group.id)];
    await savedViews.refresh();
    await mount();
    await act(async () => button("Images").click());
    expect(button("Filtered by Branding")).toBeDefined();
    expect(button("Save Filters").disabled).toBe(true);
    const rules = [{ field: "type", operator: "eq", value: "image" }] as const;
    await act(async () => updateLocalFilters([...rules]));
    expect(button("Save Filters").disabled).toBe(false);
    pondQuery.mockImplementationOnce(async () => {
      savedViewList.current = savedViewList.current.map((view) =>
        view.id === "Images"
          ? { ...view, query: { combinator: "and", rules: [...rules] } }
          : view,
      );
      return { ok: true };
    });
    await act(async () => button("Save Filters").click());
    expect(pondQuery).toHaveBeenCalledWith("savedViews.update", {
      id: "Images",
      patch: { query: { combinator: "and", rules: [...rules] } },
    });
    expect(button("Save Filters").disabled).toBe(true);
    expect(getViewState().inheritedQuery).toEqual(group.query);
  });

  function folderTransfer(id = "") {
    const data = new Map<string, string>();
    const types: string[] = [];
    if (id) {
      data.set("application/x-pond-folder", id);
      types.push("application/x-pond-folder");
    }
    return {
      types,
      dropEffect: "none",
      effectAllowed: "all",
      setData(type: string, value: string) {
        data.set(type, value);
        if (!types.includes(type)) types.push(type);
      },
      getData(type: string) {
        return data.get(type) ?? "";
      },
    };
  }

  function fireDrag(
    target: EventTarget,
    type: string,
    dataTransfer: ReturnType<typeof folderTransfer>,
  ) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    target.dispatchEvent(event);
  }

  it("nests a dragged folder inside the drop target", async () => {
    folderList.current = [folder("Travel"), folder("Shots")];
    await folders.refresh();
    await mount();
    const transfer = folderTransfer();
    await act(async () => {
      fireDrag(button("Shots"), "dragstart", transfer);
      fireDrag(button("Travel"), "drop", transfer);
    });
    expect(transfer.getData("application/x-pond-folder")).toBe("Shots");
    expect(pondQuery).toHaveBeenCalledWith("folders.move", {
      id: "Shots",
      parentId: "Travel",
    });
    expect(pondQuery).not.toHaveBeenCalledWith(
      "folders.addSaves",
      expect.anything(),
    );
  });

  it("does not move a folder into its descendant", async () => {
    folderList.current = [folder("Travel"), folder("Tickets", "Travel")];
    await folders.refresh();
    await mount();
    const transfer = folderTransfer("Travel");
    await act(async () => {
      fireDrag(button("Travel"), "dragstart", transfer);
      fireDrag(button("Tickets"), "drop", transfer);
    });
    expect(
      pondQuery.mock.calls.filter((call) => call[0] === "folders.move"),
    ).toEqual([]);
  });

  it("still files selected saves onto a folder", async () => {
    folderList.current = [folder("Travel")];
    await folders.refresh();
    selection.set(["save-1"]);
    await mount();
    await act(async () => {
      fireDrag(button("Travel"), "drop", folderTransfer());
    });
    expect(pondQuery).toHaveBeenCalledWith("folders.addSaves", {
      folderId: "Travel",
      saveIds: ["save-1"],
    });
  });

  it("does not file selected saves while rearranging folders", async () => {
    folderList.current = [folder("Travel"), folder("Shots")];
    await folders.refresh();
    selection.set(["save-1"]);
    await mount();
    await act(async () => {
      fireDrag(button("Travel"), "drop", folderTransfer("Shots"));
    });
    expect(pondQuery).toHaveBeenCalledWith("folders.move", {
      id: "Shots",
      parentId: "Travel",
    });
    expect(pondQuery).not.toHaveBeenCalledWith(
      "folders.addSaves",
      expect.anything(),
    );
  });
});
