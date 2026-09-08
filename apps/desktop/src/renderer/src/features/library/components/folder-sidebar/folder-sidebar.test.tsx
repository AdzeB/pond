import { Dialog } from "@pond/ui";
// @vitest-environment jsdom

import { PrefsSchema } from "@pond/schema";
import type { SavedView } from "@pond/schema/db";
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
import { libraryChrome } from "@/features/library/state/library-chrome";
import { savedViews } from "@/features/library/state/saved-views";
import { setAppRouter } from "@/shared/lib/app-router";
import { FolderSidebar } from "./folder-sidebar";

const pondQuery = vi.fn(async (name: string) => {
  if (name === "savedViews.list") return savedViewList.current;
  if (name === "accounts.list") return { accounts: [] };
  if (name === "watches.list") return { watches: [] };
  if (name === "tags.list") return [];
  if (name === "folders.list") return [];
  if (name === "folders.memberships") return [];
  if (name === "settings.getPrefs") return PrefsSchema.parse({});
  return { ok: true };
});
interface SavedViewFixtures {
  current: SavedView[];
}
const savedViewList: SavedViewFixtures = { current: [] };

describe("folder sidebar", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    libraryChrome.setNav({ kind: "all" });
    savedViewList.current = [];
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
    await savedViews.refresh();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
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
    const children = ["/", "/sources", "/tags", "/assistant", "/untagged"].map(
      (path) =>
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
    await act(async () => iconButton("Assistant").click());
    expect(button(label).getAttribute("aria-current")).toBeNull();
    expect(iconButton("Assistant").getAttribute("aria-current")).toBe("page");
  });

  it("places Assistant between Search and New", async () => {
    await mount();
    const search = iconButton("Search");
    const assistant = iconButton("Assistant");
    const create = iconButton("New");
    expect(
      search.compareDocumentPosition(assistant) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      assistant.compareDocumentPosition(create) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens Assistant from the header", async () => {
    const router = await mount();
    await act(async () => iconButton("Assistant").click());
    expect(router.state.location.pathname).toBe("/assistant");
    expect(iconButton("Assistant").getAttribute("aria-current")).toBe("page");
    expect(button("All").getAttribute("aria-current")).toBeNull();
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
    expect(toggles).toContain("Saved Views");
    expect(toggles).toContain("Folders");
    expect(toggles).not.toContain("Library");
    expect(toggles).not.toContain("Downloads");
  });

  async function mountUnreadView() {
    savedViewList.current = [
      {
        id: "view-1",
        name: "Unread",
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
    expect(dialog?.textContent).toContain("Delete View");
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

  it("deletes a saved view from the hover menu", async () => {
    await mountUnreadView();
    const more = host.querySelector('[aria-label="More Actions"]');
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
});
