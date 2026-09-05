// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { resetFilters, setSearchInput } from "@/stores/view-store";
import { LibraryChrome } from ".";

vi.mock("@/hooks/use-nl-query", () => ({
  useNlCompiler: () => vi.fn(),
  useNlFacets: () => ({ sources: [], tags: [], creators: [], types: [] }),
}));
vi.mock("@/hooks/use-scroll-fade", () => ({ useScrollFade: () => ({}) }));
vi.mock("@/stores/tags", () => ({ useTags: () => [] }));
vi.mock("@/stores/prefs", () => ({ usePrefs: () => [{}] }));
vi.mock("@/components/library/filter-menu", () => ({
  FilterToggle: () => null,
  FilterBar: () => null,
}));
vi.mock("@/components/library/view-menu", () => ({
  ViewMenu: () => null,
  SortMenu: () => null,
}));
vi.mock("@/components/search/bar/lib/typeahead", () => ({
  FilterTypeahead: () => null,
}));

it("shows the source filter once with one clear action", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  setSearchInput(
    [{ field: "source", operator: "eq", value: "youtube.com" }],
    "",
    "source:youtube.com",
  );
  try {
    await act(async () => root.render(<LibraryChrome />));
    expect(host.textContent?.match(/source:youtube\.com/g)).toHaveLength(1);
    expect(host.querySelectorAll('button[aria-label^="Clear"]')).toHaveLength(
      1,
    );
  } finally {
    await act(async () => root.unmount());
    resetFilters();
    host.remove();
    vi.unstubAllGlobals();
  }
});
