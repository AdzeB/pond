// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library } from "@/components/library/page";
import type { TagRow } from "@/stores/tags";
import { TagsPage } from ".";

const fixtures = vi.hoisted(() => ({
  tags: ["Animation", "Typography"].map((name, index) => ({
    id: String(index),
    name,
    description: null,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: null,
  })) satisfies TagRow[],
  groups: [],
  saves: [],
}));

vi.mock("@/hooks/use-scroll-fade", () => ({ useScrollFade: () => ({}) }));
vi.mock("@/hooks/use-saves", () => ({ useSaves: () => fixtures.saves }));
vi.mock("@/stores/tags", () => ({ useTags: () => fixtures.tags }));
vi.mock("@/stores/tag-groups", () => ({
  useTagGroups: () => fixtures.groups,
}));
vi.mock("@/components/library/chrome", () => ({
  LibraryChrome: () => <div data-testid="save-filters" />,
}));
vi.mock("@/routes/_library/-library-view", () => ({
  LibraryView: () => <div data-testid="save-grid" />,
}));
vi.mock("@/components/shell/app-shell", () => ({
  AppShell: { Content: ({ children }: { children: ReactNode }) => children },
}));

describe("library Tags page", () => {
  let host: HTMLDivElement;
  let root: Root;
  const query = vi.fn(async () => ({ ok: true }));

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("pond", { query });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    query.mockClear();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  async function mount() {
    const rootRoute = createRootRoute({ component: Library });
    const tagsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/tags",
      component: TagsPage,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([tagsRoute]),
      history: createMemoryHistory({ initialEntries: ["/tags"] }),
    });
    await act(async () => {
      await router.load();
      root.render(<RouterProvider router={router} />);
    });
  }

  async function fill(input: HTMLInputElement, value: string) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, value);
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
  }

  it("renders the tag manager instead of the saves grid", async () => {
    await mount();
    expect(host.querySelector("h1")?.textContent).toBe("Tags");
    expect(host.querySelector('[data-testid="save-grid"]')).toBeNull();
    expect(host.querySelector('[data-testid="save-filters"]')).toBeNull();
    expect(host.textContent).toContain("Animation");
    expect(host.textContent).toContain("Typography");
    expect(host.textContent).toContain("New Group");
    expect(host.textContent).toContain("New Tag");
  });

  it("filters tags using the existing manager", async () => {
    await mount();
    const search = host.querySelector('input[placeholder="Search…"]');
    if (!(search instanceof HTMLInputElement))
      throw new Error("Missing search");
    await fill(search, "animation");
    expect(host.textContent).toContain("Animation");
    expect(host.textContent).not.toContain("Typography");
  });

  it.each([
    ["New Tag", "Tag name", "tags.create"],
    ["New Group", "Group name", "tagGroups.create"],
  ])("supports %s on the library page", async (label, placeholder, command) => {
    await mount();
    const button = [...host.querySelectorAll("button")].find(
      (node) => node.textContent === label,
    );
    if (!button) throw new Error(`Missing ${label}`);
    await act(async () => button.click());
    const draft = host.querySelector(`input[placeholder="${placeholder}"]`);
    if (!(draft instanceof HTMLInputElement)) throw new Error("Missing draft");
    await fill(draft, "Design");
    await act(async () => {
      draft.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(query).toHaveBeenCalledWith(command, { name: "Design" });
  });
});
