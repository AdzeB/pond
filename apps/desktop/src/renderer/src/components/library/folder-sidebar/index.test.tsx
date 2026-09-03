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
vi.mock("@/stores/saved-views", () => ({
  savedViews: { refresh: vi.fn() },
  useSavedViews: () => [],
  useHydrateSavedViews: () => {},
}));
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
});
