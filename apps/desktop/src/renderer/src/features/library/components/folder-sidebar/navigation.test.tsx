import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { libraryChrome } from "@/features/library/state/library-chrome";
import {
  createFolderSidebarHarness,
  queueSummary,
  sidebarCounts,
} from "./test-harness";

describe("folder sidebar navigation", () => {
  const harness = createFolderSidebarHarness();

  beforeEach(() => harness.setup());
  afterEach(() => harness.cleanup());

  it("opens the full Assistant page from the sidebar", async () => {
    const router = await harness.mount();
    const assistant = harness.button("Assistant");
    expect(assistant.querySelector('[stroke="currentColor"]')).not.toBeNull();
    await act(async () => assistant.click());
    expect(router.state.location.pathname).toBe("/assistant");
    expect(harness.button("Assistant").getAttribute("aria-current")).toBe(
      "page",
    );
    expect(harness.button("All").getAttribute("aria-current")).toBeNull();
  });

  it("opens Harvester from the workspace header", async () => {
    await harness.mount();
    await act(async () => harness.iconButton("Harvester").click());
    expect(vi.mocked(window.pond.openHarvesterWindow)).toHaveBeenCalledOnce();
  });

  it("shows the running download count beside the Harvester mark", async () => {
    queueSummary.current = { ...queueSummary.current, running: 12, waiting: 4 };
    await harness.mount();
    await act(async () => {});
    const harvester = harness.iconButton("Harvester, 12 downloading");
    expect(harvester.textContent).toBe("12");
    await act(async () => harvester.click());
    expect(vi.mocked(window.pond.openHarvesterWindow)).toHaveBeenCalledOnce();
  });

  it("opens Uncategorized from the sidebar", async () => {
    const router = await harness.mount();
    await act(async () => harness.button("Uncategorized").click());
    expect(router.state.location.pathname).toBe("/");
    expect(libraryChrome.getState().nav).toEqual({ kind: "uncategorized" });
    expect(harness.button("Uncategorized").getAttribute("aria-current")).toBe(
      "page",
    );
    expect(harness.button("All").getAttribute("aria-current")).toBeNull();
  });

  it("opens Untagged from the sidebar", async () => {
    const router = await harness.mount();
    await act(async () => harness.button("Untagged").click());
    expect(router.state.location.pathname).toBe("/untagged");
    expect(harness.button("Untagged").getAttribute("aria-current")).toBe(
      "page",
    );
    expect(harness.button("All").getAttribute("aria-current")).toBeNull();
  });

  it("shows counts on library destinations", async () => {
    sidebarCounts.current.recentlyUsed = 4;
    await harness.mount();
    expect(harness.button("Recently Used").textContent).toContain("4");
    for (const label of ["All", "Uncategorized", "Untagged", "Tags", "Trash"]) {
      expect(harness.button(label).textContent).toContain("0");
    }
  });

  it("opens Tags from the sidebar with an outline icon", async () => {
    const router = await harness.mount();
    const tags = harness.button("Tags");
    expect(tags.querySelector('[stroke="currentColor"]')).not.toBeNull();
    expect(tags.querySelector('path[fill="currentColor"]')).toBeNull();
    await act(async () => tags.click());
    expect(router.state.location.pathname).toBe("/tags");
    expect(tags.getAttribute("aria-current")).toBe("page");
    expect(harness.button("All").getAttribute("aria-current")).toBeNull();
  });

  it.each([
    ["/tags", "Tags"],
    ["/untagged", "Untagged"],
  ])("highlights only %s when opened directly", async (path, label) => {
    await harness.mount(path);
    expect(harness.host.querySelectorAll('[aria-current="page"]')).toHaveLength(
      1,
    );
    expect(
      harness.rowLabel(
        harness.host.querySelector('[aria-current="page"]') ?? harness.host,
      ),
    ).toBe(label);
  });

  it.each([
    ["/tags", "Tags"],
    ["/untagged", "Untagged"],
  ])("updates the %s highlight across route history", async (path, label) => {
    const router = await harness.mount(path);
    await act(async () => harness.button("All").click());
    expect(router.state.location.pathname).toBe("/");
    expect(harness.button("All").getAttribute("aria-current")).toBe("page");
    await act(async () => router.history.back());
    expect(router.state.location.pathname).toBe(path);
    expect(harness.button(label).getAttribute("aria-current")).toBe("page");
    expect(harness.button("All").getAttribute("aria-current")).toBeNull();
    await act(async () => harness.button("Uncategorized").click());
    expect(harness.button(label).getAttribute("aria-current")).toBeNull();
    expect(harness.button("Uncategorized").getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("groups library destinations", async () => {
    await harness.mount();
    const labels = [...harness.host.querySelectorAll("button")].map(
      harness.rowLabel,
    );
    const library = labels.indexOf("All");
    const uncategorized = labels.indexOf("Uncategorized");
    const assistant = labels.indexOf("Assistant");
    const untagged = labels.indexOf("Untagged");
    const tags = labels.indexOf("Tags");
    const trash = labels.indexOf("Trash");
    expect(library).toBeLessThan(uncategorized);
    expect(uncategorized).toBeLessThan(assistant);
    expect(assistant).toBeLessThan(untagged);
    expect(untagged).toBeLessThan(tags);
    expect(tags).toBeLessThan(trash);
    expect(labels).not.toContain("Downloads");
    expect(labels).not.toContain("Sources");
  });

  it("does not collapse library and downloads groups", async () => {
    await harness.mount();
    const toggles = [
      ...harness.host.querySelectorAll("button[aria-expanded]"),
    ].map((node) => node.textContent?.trim());
    expect(toggles).toContain("Smart Folders");
    expect(toggles).toContain("Folders");
    expect(toggles).not.toContain("Library");
    expect(toggles).not.toContain("Downloads");
  });
});
