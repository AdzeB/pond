// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOverlays,
  resetFilters,
  setSearchInput,
  setSemanticQuery,
  useFilterQuery,
  useSearchText,
} from "@/stores/view-store";
import { FilterBar, FilterToggle } from ".";
import { filterToolbar } from "./toolbar-state";

vi.mock("@/hooks/use-nl-query", () => ({
  useNlFacets: () => ({
    sources: ["youtube.com", "vimeo.com"],
    tags: [],
    creators: [],
    types: [],
  }),
}));
vi.mock("@/hooks/use-scroll-fade", () => ({ useScrollFade: () => ({}) }));
vi.mock("@/stores/tags", () => ({ useTags: () => [{ name: "Design" }] }));
vi.mock("@/stores/tag-groups", () => ({ useTagGroups: () => [] }));
vi.mock("@/stores/folders", () => ({
  useFolders: () => [{ id: "folder-a", name: "Inspiration" }],
}));
vi.mock("@/stores/prefs", () => ({ usePrefs: () => [{}] }));

function State() {
  return (
    <output>
      {JSON.stringify({ query: useFilterQuery(), text: useSearchText() })}
    </output>
  );
}

describe("filter toolbar", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    resetFilters();
    filterToolbar.setOpen(true);
    filterToolbar.restoreDefaults();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    resetFilters();
    vi.unstubAllGlobals();
  });

  async function render() {
    await act(async () =>
      root.render(
        <>
          <FilterToggle />
          <FilterBar />
          <State />
        </>,
      ),
    );
  }

  function state() {
    return JSON.parse(host.querySelector("output")?.textContent ?? "{}");
  }

  function button(label: string) {
    const match = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (node) =>
        node.getAttribute("aria-label") === label || node.textContent === label,
    );
    if (!match) throw new Error(`Missing button ${label}`);
    return match;
  }

  it("shows categories directly and hides the toolbar without clearing filters", async () => {
    setSearchInput(
      [{ field: "source", operator: "eq", value: "youtube.com" }],
      "cats",
      "source:youtube.com cats",
    );
    await render();
    expect(button("Source: youtube.com").textContent).toBe("youtube.com");
    expect(button("Tags")).toBeTruthy();
    const toggle = button("Filter (1 active)");
    const before = state();
    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const toolbar = host.querySelector("fieldset");
    expect(toolbar?.hasAttribute("data-open")).toBe(false);
    expect(toolbar?.getAttribute("aria-hidden")).toBe("true");
    expect(toolbar?.hasAttribute("inert")).toBe(true);
    expect(button("Source: youtube.com")).toBeTruthy();
    expect(state()).toEqual(before);
    await act(async () => toggle.click());
    expect(toolbar?.hasAttribute("data-open")).toBe(true);
    expect(toolbar?.getAttribute("aria-hidden")).toBe("false");
    expect(toolbar?.hasAttribute("inert")).toBe(false);
    expect(button("Source: youtube.com")).toBeTruthy();
  });

  it("clears only the chosen field while keeping text and other filters", async () => {
    setSearchInput(
      [
        { field: "type", operator: "eq", value: "video" },
        { field: "source", operator: "eq", value: "youtube.com" },
      ],
      "cats",
      "type:video source:youtube.com cats",
    );
    await render();
    await act(async () => button("Clear Source Filter").click());
    expect(state()).toEqual({
      query: {
        combinator: "and",
        rules: [{ field: "type", operator: "eq", value: "video" }],
      },
      text: "cats",
    });
    expect(button("Source")).toBeTruthy();
    await act(async () => button("Clear Filters").click());
    expect(state()).toEqual({
      query: { combinator: "and", rules: [] },
      text: "cats",
    });
  });

  it("keeps an active category visible when it is unpinned", async () => {
    setSearchInput(
      [{ field: "creator", operator: "eq", value: "jane" }],
      "",
      "by:jane",
    );
    await render();
    expect(button("Creator: jane")).toBeTruthy();
    await act(async () => filterToolbar.setPinned("creator", false));
    expect(button("Creator: jane")).toBeTruthy();
    await act(async () => button("Clear Creator Filter").click());
    expect(
      [...host.querySelectorAll("button")].some(
        (node) => node.getAttribute("aria-label") === "Creator",
      ),
    ).toBe(false);
  });

  it("shows added categories and names selected folders without exposing IDs", async () => {
    setSearchInput(
      [{ field: "folder", operator: "some", value: ["folder-a"] }],
      "",
      "folder:folder-a",
    );
    await render();
    expect(button("Folders: Inspiration").textContent).toBe("Inspiration");
    await act(async () => filterToolbar.setPinned("transcript", true));
    expect(button("Transcript")).toBeTruthy();
  });

  it("clears a Semantic overlay with Clear Filters", async () => {
    setSemanticQuery("black cat");
    await render();
    expect(button("Filter (1 active)")).toBeTruthy();
    expect(getOverlays().semanticQuery).toBe("black cat");
    await act(async () => button("Clear Filters").click());
    expect(getOverlays().semanticQuery).toBeNull();
  });
});
