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
import { rememberListPath } from "@/lib/ui/list-path";
import { libraryChrome } from "@/stores/library-chrome";
import { resetFilters } from "@/stores/view-store";
import { Toolbar } from ".";

vi.mock("@/hooks/use-scroll-fade", () => ({ useScrollFade: () => ({}) }));
vi.mock("@/hooks/use-saves", () => ({
  useSave: (id: string | null) =>
    id ? { title: "A saved design", url: "https://example.com" } : undefined,
}));
vi.mock("@/stores/recents", () => ({ useRecents: () => [] }));
vi.mock("@/stores/view-store", () => ({ resetFilters: vi.fn() }));
vi.mock("@/stores/folders", () => ({
  useFolders: () => [
    { id: "parent", name: "Design", parentId: null },
    { id: "child", name: "Interfaces", parentId: "parent" },
    { id: "deep", name: "Mobile", parentId: "child" },
  ],
}));

describe("breadcrumb toolbar", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.clearAllMocks();
    libraryChrome.setNav({ kind: "all" });
    rememberListPath("/");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  function button(name: string): HTMLButtonElement {
    const match = [...document.querySelectorAll("button")].find(
      (node) =>
        (node.getAttribute("aria-label") ?? node.textContent)?.trim() === name,
    );
    if (!match) throw new Error(`Missing button: ${name}`);
    return match;
  }

  async function mount(path = "/") {
    const rootRoute = createRootRoute({ component: Toolbar });
    const children = ["/", "/save/$saveId", "/sources"].map((path) =>
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

  it("shows one current location without any tab controls", async () => {
    await mount();
    expect(host.querySelector('nav[aria-label="Breadcrumb"]')).not.toBeNull();
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Library",
    );
    expect(host.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(host.querySelector('[role="tablist"]')).toBeNull();
    expect(host.querySelector('[aria-label="New Tab"]')).toBeNull();
  });

  it("navigates to parent folders and clears filters only at Library", async () => {
    libraryChrome.setNav({ kind: "folder", id: "child" });
    const router = await mount();
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Interfaces",
    );
    await act(async () => button("Design").click());
    expect(libraryChrome.getState().nav).toEqual({
      kind: "folder",
      id: "parent",
    });
    expect(router.state.location.pathname).toBe("/");
    expect(resetFilters).not.toHaveBeenCalled();
    await act(async () => button("Library").click());
    expect(libraryChrome.getState().nav).toEqual({ kind: "all" });
    expect(resetFilters).toHaveBeenCalledOnce();
  });

  it("uses the save title and returns to its containing list", async () => {
    const router = await mount("/save/demo");
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe(
      "A saved design",
    );
    await act(async () => button("Library").click());
    expect(router.state.location.pathname).toBe("/");
  });

  it("keeps hidden ancestors accessible through the overflow menu", async () => {
    libraryChrome.setNav({ kind: "folder", id: "deep" });
    await mount();
    await act(async () => button("Show Parent Folders").click());
    const parent = [...document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent === "Design",
    );
    if (!(parent instanceof HTMLElement))
      throw new Error("Missing parent folder");
    await act(async () => parent.click());
    expect(libraryChrome.getState().nav).toEqual({
      kind: "folder",
      id: "parent",
    });
  });

  it("updates back and forward controls using the single router history", async () => {
    const router = await mount();
    expect(button("Back").disabled).toBe(true);
    await act(async () => router.history.push("/sources"));
    expect(button("Back").disabled).toBe(false);
    expect(button("Forward").disabled).toBe(true);
    await act(async () => button("Back").click());
    expect(router.state.location.pathname).toBe("/");
    expect(button("Forward").disabled).toBe(false);
    await act(async () => button("Forward").click());
    expect(router.state.location.pathname).toBe("/sources");
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Sources",
    );
  });
});
