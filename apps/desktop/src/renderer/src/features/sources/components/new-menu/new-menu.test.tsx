// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { sourceNewMenu } from "@/features/sources/state/source-new-menu";
import { NewSourceMenu } from "./new-menu";

const labels = ["Connect a Source", "Watch Account", "Watched Folder"];

describe("new source menu", () => {
  let host: HTMLDivElement;
  let root: Root;
  const onWatchedFolder = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    sourceFlow.close();
    sourceNewMenu.close();
    onWatchedFolder.mockReset();
  });

  afterEach(async () => {
    sourceFlow.close();
    sourceNewMenu.close();
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  async function renderMenu(controlled = false) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <NewSourceMenu
            controlled={controlled}
            onWatchedFolder={onWatchedFolder}
          />
        </QueryClientProvider>,
      ),
    );
  }

  async function openMenu() {
    await renderMenu();
    const trigger = [...document.querySelectorAll("button")].find(
      (el) => el.getAttribute("aria-label") === "New Source",
    );
    if (!trigger) throw new Error("Missing New Source");
    await act(async () => trigger.click());
  }

  it("lists every source create action", async () => {
    await openMenu();
    const text = document.body.textContent ?? "";
    for (const label of labels) expect(text).toContain(label);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens connect and watch flows without a chooser dialog", async () => {
    await openMenu();
    const connect = [...document.querySelectorAll('[role="menuitem"]')].find(
      (el) => el.textContent?.includes("Connect a Source"),
    );
    if (!(connect instanceof HTMLElement)) throw new Error("Missing connect");
    await act(async () => connect.click());
    expect(sourceFlow.current()).toBe("connect-source");

    sourceFlow.close();
    await openMenu();
    const watch = [...document.querySelectorAll('[role="menuitem"]')].find(
      (el) => el.textContent?.includes("Watch Account"),
    );
    if (!(watch instanceof HTMLElement)) throw new Error("Missing watch");
    await act(async () => watch.click());
    expect(sourceFlow.current()).toBe("watch-target");
  });

  it("picks a watched folder from the same menu", async () => {
    await openMenu();
    const item = [...document.querySelectorAll('[role="menuitem"]')].find(
      (el) => el.textContent?.includes("Watched Folder"),
    );
    if (!(item instanceof HTMLElement)) throw new Error("Missing folder");
    await act(async () => item.click());
    expect(onWatchedFolder).toHaveBeenCalledOnce();
    expect(sourceFlow.current()).toBeNull();
  });

  it("opens from the new-source shortcut store", async () => {
    await renderMenu(true);
    expect(document.body.textContent).not.toContain("Watch Account");
    await act(async () => sourceNewMenu.open());
    expect(document.body.textContent).toContain("Watch Account");
  });
});
