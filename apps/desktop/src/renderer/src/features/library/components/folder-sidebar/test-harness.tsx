import { PrefsSchema } from "@pond/schema";
import type { Folder, SavedView } from "@pond/schema/db";
import { Dialog } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { vi } from "vitest";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { savedViews } from "@/features/library/state/saved-views";
import { resetFilters } from "@/features/library/state/view-store";
import { selection } from "@/features/saves/state/selection";
import { setAppRouter } from "@/shared/lib/app-router";
import { FolderSidebar } from ".";

interface SavedViewFixtures {
  current: SavedView[];
}

interface FolderFixtures {
  current: Folder[];
}

export const savedViewList: SavedViewFixtures = { current: [] };
export const folderList: FolderFixtures = { current: [] };

export const pondQuery = vi.fn(async (name: string) => {
  if (name === "saves.sidebarCounts")
    return { library: 0, uncategorized: 0, untagged: 0, trash: 0, folders: {} };
  if (name === "savedViews.list") return savedViewList.current;
  if (name === "accounts.list") return { accounts: [] };
  if (name === "watches.list") return { watches: [] };
  if (name === "tags.list") return [];
  if (name === "folders.list") return folderList.current;
  if (name === "folders.memberships") return [];
  if (name === "library.info")
    return { path: "/tmp/My Pond.pond", name: "My Pond" };
  if (name === "library.recent") return [];
  if (name === "settings.getPrefs") return PrefsSchema.parse({});
  return { ok: true };
});

export function folder(name: string, parentId: string | null = null): Folder {
  return {
    id: name,
    name,
    parentId,
    color: null,
    sortOrder: 0,
    createdAt: new Date(),
  };
}

export function savedView(
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

export function folderTransfer(id = "") {
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

export function fireDrag(
  target: EventTarget,
  type: string,
  dataTransfer: ReturnType<typeof folderTransfer>,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  target.dispatchEvent(event);
}

export function createFolderSidebarHarness() {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  function getHost(): HTMLDivElement {
    if (!host) throw new Error("Sidebar harness isn't set up");
    return host;
  }

  return {
    get host() {
      return getHost();
    },
    async setup(): Promise<void> {
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
    },
    async cleanup(): Promise<void> {
      if (root) await act(async () => root?.unmount());
      host?.remove();
      root = null;
      host = null;
      selection.clear();
      vi.unstubAllGlobals();
    },
    rowLabel(node: Element): string {
      return node.textContent?.replace(/[\d,]+$/, "").trim() ?? "";
    },
    button(label: string): HTMLButtonElement {
      const match = [...getHost().querySelectorAll("button")].find(
        (node) =>
          (node.textContent?.replace(/[\d,]+$/, "").trim() ?? "") === label,
      );
      if (!match) throw new Error(`Missing sidebar button: ${label}`);
      return match;
    },
    iconButton(label: string): HTMLElement {
      const match = getHost().querySelector(`[aria-label="${label}"]`);
      if (!(match instanceof HTMLElement)) {
        throw new Error(`Missing icon button: ${label}`);
      }
      return match;
    },
    menuItem(label: string): HTMLElement {
      const node = [...document.querySelectorAll('[role="menuitem"]')].find(
        (item) => item.textContent?.trim() === label,
      );
      if (!(node instanceof HTMLElement))
        throw new Error(`Missing menu item: ${label}`);
      return node;
    },
    async mount(path = "/") {
      if (!root) throw new Error("Sidebar harness isn't set up");
      const rootRoute = createRootRoute({ component: FolderSidebar });
      const children = [
        "/",
        "/sources",
        "/tags",
        "/assistant",
        "/untagged",
        "/downloads",
      ].map((routePath) =>
        createRoute({
          getParentRoute: () => rootRoute,
          path: routePath,
          component: () => null,
        }),
      );
      const router = createRouter({
        routeTree: rootRoute.addChildren(children),
        history: createMemoryHistory({ initialEntries: [path] }),
      });
      setAppRouter(router);
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      await act(async () => {
        await router.load();
        root?.render(
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Dialog.Host />
          </QueryClientProvider>,
        );
      });
      return router;
    },
  };
}
