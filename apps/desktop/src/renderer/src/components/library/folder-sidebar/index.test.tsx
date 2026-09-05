// @vitest-environment jsdom
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
import { setAppRouter } from "@/lib/ui/app-router";
import { libraryChrome } from "@/stores/library-chrome";
import { FolderSidebar } from ".";

vi.mock("@/hooks/use-scroll-fade", () => ({ useScrollFade: () => ({}) }));
vi.mock("@/lib/status-feed", () => ({
  useStatusFeed: () => ({ inProgress: { busy: false } }),
}));
vi.mock("@/stores/folders", () => ({ useFolders: () => [] }));
vi.mock("@/stores/view-store", () => ({
  resetFilters: vi.fn(),
  applySavedView: vi.fn(),
  setIncludeSubfolders: vi.fn(),
  useIncludeSubfolders: () => true,
  useViewStore: () => ({
    activeViewId: null,
    query: { combinator: "and", rules: [] },
    sortKey: "savedAt",
    sortDir: "desc",
    layout: "waterfall",
  }),
}));
const confirm = vi.hoisted(() => vi.fn());
const pondQuery = vi.hoisted(() => vi.fn());
const refreshViews = vi.hoisted(() => vi.fn());
const savedViewList = vi.hoisted(() => ({
  current: [] as Array<{
    id: string;
    name: string;
    query: { combinator: "and"; rules: [] };
  }>,
}));

vi.mock("@/stores/saved-views", () => ({
  savedViews: { refresh: refreshViews },
  promptCreateView: vi.fn(),
  useSavedViews: () => savedViewList.current,
  useHydrateSavedViews: () => {},
}));
vi.mock("@/components/shared/confirm-dialog", () => ({ confirm }));
vi.mock("@/components/library/new-menu", () => ({ NewMenu: () => null }));
vi.mock("@/components/library/new-menu/actions", () => ({
  newFolder: vi.fn(),
}));

describe("folder sidebar", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    libraryChrome.setNav({ kind: "all" });
    savedViewList.current = [];
    confirm.mockReset();
    pondQuery.mockReset();
    refreshViews.mockReset();
    window.pond = { query: pondQuery } as unknown as typeof window.pond;
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  function button(label: string) {
    const match = [...host.querySelectorAll("button")].find(
      (node) => node.textContent?.trim() === label,
    );
    if (!match) throw new Error(`Missing sidebar button: ${label}`);
    return match;
  }

  async function mount(path = "/") {
    const rootRoute = createRootRoute({ component: FolderSidebar });
    const children = ["/", "/sources", "/tags", "/assistant"].map((path) =>
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
      root.render(<RouterProvider router={router} />);
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

  it("does not show Uncategorized in the sidebar", async () => {
    await mount();
    expect(
      [...host.querySelectorAll("button")].some(
        (node) => node.textContent?.trim() === "Uncategorized",
      ),
    ).toBe(false);
  });

  it("opens Tags from the sidebar with an outline icon", async () => {
    const router = await mount();
    const tags = button("Tags");
    expect(tags.querySelector('[stroke="currentColor"]')).not.toBeNull();
    expect(tags.querySelector('path[fill="currentColor"]')).toBeNull();
    await act(async () => tags.click());
    expect(router.state.location.pathname).toBe("/tags");
    expect(tags.getAttribute("aria-current")).toBe("page");
    expect(button("Library").getAttribute("aria-current")).toBeNull();
  });

  it.each([
    ["/sources", "Sources"],
    ["/tags", "Tags"],
  ])("highlights only %s when opened directly", async (path, label) => {
    await mount(path);
    expect(host.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe(
      label,
    );
  });

  it.each([
    ["/sources", "Sources"],
    ["/tags", "Tags"],
  ])("updates the %s highlight across route history", async (path, label) => {
    const router = await mount(path);
    await act(async () => button("Library").click());
    expect(router.state.location.pathname).toBe("/");
    expect(button("Library").getAttribute("aria-current")).toBe("page");
    await act(async () => router.history.back());
    expect(router.state.location.pathname).toBe(path);
    expect(button(label).getAttribute("aria-current")).toBe("page");
    expect(button("Library").getAttribute("aria-current")).toBeNull();
    await act(async () => button("Assistant").click());
    expect(button(label).getAttribute("aria-current")).toBeNull();
    expect(button("Assistant").getAttribute("aria-current")).toBe("page");
  });

  it("keeps Assistant with destinations, not Saved Views", async () => {
    await mount();
    const labels = [...host.querySelectorAll("button")].map((node) =>
      node.textContent?.trim(),
    );
    expect(labels.indexOf("Assistant")).toBeGreaterThan(-1);
    expect(labels.indexOf("Assistant")).toBeLessThan(
      labels.indexOf("Saved Views"),
    );
  });

  async function mountUnreadView() {
    savedViewList.current = [
      {
        id: "view-1",
        name: "Unread",
        query: { combinator: "and", rules: [] },
      },
    ];
    pondQuery.mockResolvedValue({ ok: true });
    refreshViews.mockResolvedValue(undefined);
    await mount();
  }

  async function confirmDelete() {
    const remove = [...document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent?.trim() === "Delete",
    );
    if (!(remove instanceof HTMLElement)) throw new Error("Missing Delete");
    await act(async () => remove.click());
    expect(confirm).toHaveBeenCalledOnce();
    const options = confirm.mock.calls[0]?.[0] as {
      title: string;
      onConfirm: () => Promise<void>;
    };
    expect(options.title).toBe("Delete View");
    await act(async () => {
      await options.onConfirm();
    });
    expect(pondQuery).toHaveBeenCalledWith("savedViews.delete", {
      id: "view-1",
    });
    expect(refreshViews).toHaveBeenCalled();
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
