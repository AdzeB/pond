// @vitest-environment jsdom
import { Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import {
  watchedFolderFlow,
  watchedFolderRevision,
} from "@/features/sources/state/watched-folder-flow";
import { FoldersPage } from "./";

const folder = {
  enabled: true,
  path: "/Users/raphael/Downloads",
  mode: "copy" as const,
  history: [
    {
      at: Date.now() - 60_000,
      name: "photo.jpg",
      mode: "copy" as const,
      ok: true,
    },
  ],
};

describe("Folders page", () => {
  let host: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const query = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    watchedFolderFlow.clear();
    query.mockImplementation(async (name: string) => {
      if (name === "autoImport.status") return folder;
      return { ok: false, path: null };
    });
    vi.stubGlobal("pond", { query });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(async () => {
    watchedFolderFlow.clear();
    await act(async () => root.unmount());
    client.clear();
    host.remove();
    vi.unstubAllGlobals();
  });

  async function render() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Tooltip.Provider>
            <FoldersPage />
          </Tooltip.Provider>
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
  }

  it("lists the watched folder", async () => {
    await render();
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Downloads");
    });
    expect(document.body.textContent).toContain("~/Downloads");
    expect(document.body.textContent).toContain("Watching");
    expect(document.body.textContent).toContain("1");
  });

  it("shows an empty state when no folder is set", async () => {
    query.mockImplementation(async (name: string) => {
      if (name === "autoImport.status") {
        return { enabled: false, path: "", mode: "copy", history: [] };
      }
      return { ok: true, path: "/Users/raphael/Inbox" };
    });
    await render();
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("No folders yet");
    });
    const button = [...document.querySelectorAll("button")].find((el) =>
      el.textContent?.includes("New Folder"),
    );
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("Missing New Folder");
    }
    await act(async () => {
      button.click();
    });
    await vi.waitFor(() => {
      expect(watchedFolderRevision()).toBe(1);
    });
    expect(query).toHaveBeenCalledWith("autoImport.pickFolder", {});
  });

  it("hides the folder when search does not match", async () => {
    await render();
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Downloads");
    });
    const search = host.querySelector('input[aria-label="Search Folders"]');
    if (!(search instanceof HTMLInputElement)) {
      throw new Error("Missing folder search");
    }
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(search, "missing");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("No results found");
    expect(document.body.textContent).not.toContain("~/Downloads");
  });
});

describe("pickWatchedFolder", () => {
  beforeEach(() => {
    watchedFolderFlow.clear();
  });

  afterEach(() => {
    watchedFolderFlow.clear();
    vi.unstubAllGlobals();
  });

  it("ignores a cancelled picker", async () => {
    vi.stubGlobal("pond", {
      query: vi.fn(async () => ({ ok: false, path: null })),
    });
    await pickWatchedFolder();
    expect(watchedFolderRevision()).toBe(0);
  });
});
