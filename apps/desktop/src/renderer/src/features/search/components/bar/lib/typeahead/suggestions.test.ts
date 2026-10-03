import { describe, expect, it } from "vitest";
import { buildMenu, type TypeaheadFacets, triggerFn } from "./suggestions";

const facets: TypeaheadFacets = {
  sources: ["notyoutube.com", "youtube.com"],
  tags: ["motion design", "design"],
  creators: ["Jane Smith"],
  accounts: [],
};

describe("search suggestions", () => {
  it("does not suggest filters for ordinary search text", () => {
    expect(buildMenu("d", facets)).toBeNull();
    expect(buildMenu("youtube", facets)).toBeNull();
    expect(buildMenu("design", facets)).toBeNull();
  });

  it("keeps existing selections when completing a comma-separated filter", () => {
    expect(buildMenu("source:youtube.com,local", facets)?.items[0]?.token).toBe(
      "source:youtube.com,local",
    );
  });

  it("suggests remaining sources after a comma without repeating selected values", () => {
    const items = buildMenu("-source:youtube.com,", facets)?.items ?? [];
    expect(items.map((item) => item.token)).toContain(
      "-source:youtube.com,local",
    );
    expect(items.some((item) => item.label === "youtube.com")).toBe(false);
  });

  it("resolves folder names to their stored IDs", () => {
    const next = {
      ...facets,
      folders: [{ value: "folder-123", label: "Inspiration" }],
    };
    expect(buildMenu("inspiration", next)).toBeNull();
    expect(buildMenu("folder:insp", next)?.items[0]?.token).toBe(
      "folder:folder-123",
    );
  });

  it("keeps comparison operators on date suggestions", () => {
    expect(buildMenu("saved<today", facets)?.items[0]?.token).toBe(
      "saved<today",
    );
  });

  it("completes quoted names with spaces", () => {
    expect(triggerFn('cats by:"Jane S')?.matchingString).toBe('by:"Jane S');
    expect(buildMenu('by:"Jane S', facets)?.items[0]?.token).toBe(
      'by:"Jane Smith"',
    );
  });

  it("caps creator suggestions like other fields", () => {
    expect(
      buildMenu("by:", {
        ...facets,
        creators: Array.from({ length: 30 }, (_, i) => `Creator ${i}`),
      })?.items,
    ).toHaveLength(8);
  });

  it("does not offer fields from a substring in an ordinary word", () => {
    expect(
      buildMenu("at", { sources: [], tags: [], creators: [], accounts: [] }),
    ).toBeNull();
  });
});
