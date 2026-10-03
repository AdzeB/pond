import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { savedViews } from "@/features/library/state/saved-views";
import {
  getOverlays,
  resetFilters,
  setSearchInput,
  setSemanticQuery,
  useFilterQuery,
  useSearchText,
} from "@/features/library/state/view-store";
import { FilterBarView, FilterToggle } from "./";
import { filterToolbar } from "./toolbar-state";

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
    vi.stubGlobal("pond", { query: async () => PrefsSchema.parse({}) });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
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
    vi.restoreAllMocks();
  });

  async function render() {
    await act(async () =>
      root.render(
        <>
          <FilterToggle />
          <FilterBarView
            tags={[{ name: "Design" }]}
            tagGroups={[]}
            folders={[{ id: "folder-a", name: "Inspiration" }]}
            facets={{
              sources: ["youtube.com", "vimeo.com"],
              tags: [],
              creators: [],
              types: [],
            }}
            refs={[]}
          />
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

  it("pins Eagle's default categories including Visual Match and Semantic", async () => {
    await render();
    expect(
      [...host.querySelectorAll("fieldset button")].map(
        (node) => node.getAttribute("aria-label") ?? "",
      ),
    ).toEqual([
      "Color",
      "Visual Match",
      "Semantic",
      "Tags",
      "Folders",
      "Shape",
      "Rating",
      "Type",
      "Format",
      "Dimensions",
      "Duration",
      "Size",
      "Comment",
      "Note",
      "URL",
      "Date Saved",
      "Date Modified",
      "Customize Filters",
      "Save",
      "Clear Filters",
    ]);
    expect(button("Color").querySelector("[data-spectrum]")).not.toBeNull();
    for (const label of ["Customize Filters", "Save", "Clear Filters"]) {
      expect(button(label).querySelector("svg")).not.toBeNull();
    }
    expect(button("Save").textContent).toBe("");
    expect(button("Clear Filters").textContent).toBe("");
  });

  it("groups filter customization into named sections", async () => {
    await render();
    await act(async () => button("Customize Filters").click());
    const menu = document.querySelector('[role="menu"]');
    expect(menu?.textContent).toContain("Discovery");
    expect(menu?.textContent).toContain("Organize");
    expect(menu?.textContent).toContain("Media");
    expect(menu?.textContent).toContain("Details");
    expect(menu?.textContent).toContain("Dates");
    expect(menu?.textContent).toContain("Reset Filters");
    const discovery = [...document.querySelectorAll('[role="menuitem"]')].find(
      (node) => node.textContent === "Discovery",
    );
    expect(discovery?.getAttribute("aria-haspopup")).toBe("menu");
  });

  it("shows categories directly and hides the toolbar without clearing filters", async () => {
    setSearchInput(
      [{ field: "source", operator: "eq", value: "youtube.com" }],
      "cats",
      "source:youtube.com cats",
    );
    await render();
    expect(button("Source: YouTube").textContent).toBe("YouTube");
    expect(button("Tags")).toBeTruthy();
    const toggle = button("Filter");
    const before = state();
    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(state()).toEqual(before);
    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelector("#library-filter-toolbar")).not.toBeNull();
    expect(button("Source: YouTube")).toBeTruthy();
  });

  it("creates an Untitled saved view and starts inline naming", async () => {
    const created = {
      id: "view-1",
      name: "Untitled",
      kind: "saved_view" as const,
      parentId: null,
      query: { combinator: "and" as const, rules: [] },
      question: null,
      sortKey: "savedAt" as const,
      sortDir: "desc" as const,
      layout: "waterfall" as const,
      sortOrder: 0,
      createdAt: new Date(),
    };
    vi.spyOn(savedViews, "create").mockResolvedValue(created);
    const startEditing = vi.spyOn(savedViews, "startEditing");
    await render();

    await act(async () => button("Save").click());

    expect(savedViews.create).toHaveBeenCalledWith({
      kind: "saved_view",
      name: "Untitled",
    });
    await vi.waitFor(() => expect(startEditing).toHaveBeenCalledWith("view-1"));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("shows source names without changing filter values", async () => {
    setSearchInput(
      [{ field: "source", operator: "eq", value: "x.com" }],
      "",
      "source:x.com",
    );
    await render();
    const source = button("Source: Twitter");
    expect(source.textContent).toBe("Twitter");

    expect(state().query.rules).toEqual([
      { field: "source", operator: "eq", value: "x.com" },
    ]);
  });

  it("shows the selected color as the chip icon instead of its hex value", async () => {
    setSearchInput(
      [
        {
          field: "color",
          operator: "near",
          value: { hex: "#2b76e7", tolerance: 60 },
        },
      ],
      "",
    );
    await render();
    const color = button("Color: Blue");
    expect(color.textContent).toBe("Color");
    expect(color.querySelector('[data-swatch="#2b76e7"]')).not.toBeNull();
    expect(color.querySelector("[data-spectrum]")).toBeNull();
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
    expect(button("Type: Video")).toBeTruthy();
    expect(
      [...host.querySelectorAll("button")].some(
        (node) => node.getAttribute("aria-label") === "Source",
      ),
    ).toBe(false);
  });

  it("clears all toolbar filters while keeping search text", async () => {
    setSearchInput(
      [
        { field: "type", operator: "eq", value: "video" },
        { field: "source", operator: "eq", value: "youtube.com" },
      ],
      "cats",
      "type:video source:youtube.com cats",
    );
    setSemanticQuery("black cat");
    await render();
    await act(async () => button("Clear Filters").click());
    expect(state()).toEqual({
      query: { combinator: "and", rules: [] },
      text: "cats",
    });
    expect(getOverlays().semanticQuery).toBeNull();
    expect(button("Clear Filters").disabled).toBe(true);
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

  it("clears a Semantic overlay from its chip", async () => {
    setSemanticQuery("black cat");
    await render();
    expect(button("Filter")).toBeTruthy();
    expect(getOverlays().semanticQuery).toBe("black cat");
    await act(async () => button("Clear Semantic Filter").click());
    expect(getOverlays().semanticQuery).toBeNull();
  });
});
