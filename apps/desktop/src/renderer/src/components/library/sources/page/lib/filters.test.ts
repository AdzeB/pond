import { describe, expect, it } from "vitest";
import {
  defaultSourceFilters,
  describeSourcesFilters,
  type FilterableSource,
  KIND_OPTIONS,
  matchesSourceFilters,
  type SourceKind,
  type SourceStatusId,
  selectedSummary,
  sourceStatusId,
} from "./filters";

function row(
  partial: Partial<FilterableSource> & Pick<FilterableSource, "name">,
): FilterableSource {
  return {
    handle: null,
    source: "twitter",
    sourceLabel: "Twitter",
    kind: "account",
    statusId: "active",
    ...partial,
  };
}

describe("sourceStatusId", () => {
  it("maps a running sync to syncing", () => {
    expect(sourceStatusId("run", true)).toBe("syncing");
  });

  it("maps a disconnected idle source to offline", () => {
    expect(sourceStatusId("idle", false)).toBe("offline");
  });

  it("maps a connected idle source to active", () => {
    expect(sourceStatusId("idle", true)).toBe("active");
    expect(sourceStatusId("ok", true)).toBe("active");
  });
});

describe("matchesSourceFilters", () => {
  const raphael = row({
    name: "Raphael",
    handle: "raphael",
    source: "twitter",
    sourceLabel: "Twitter",
  });

  it("shows every row when no filters are set", () => {
    expect(matchesSourceFilters(raphael, defaultSourceFilters())).toBe(true);
  });

  it("matches search against name, handle, and source", () => {
    const filters = defaultSourceFilters();
    filters.q = "raph";
    expect(matchesSourceFilters(raphael, filters)).toBe(true);
    filters.q = "twitter";
    expect(matchesSourceFilters(raphael, filters)).toBe(true);
    filters.q = "missing";
    expect(matchesSourceFilters(raphael, filters)).toBe(false);
  });

  it("hides rows whose status is not selected", () => {
    const filters = {
      ...defaultSourceFilters(),
      statuses: new Set<SourceStatusId>(["failed"]),
    };
    expect(matchesSourceFilters(raphael, filters)).toBe(false);
    expect(
      matchesSourceFilters({ ...raphael, statusId: "failed" }, filters),
    ).toBe(true);
  });

  it("hides rows whose kind is not selected", () => {
    const filters = {
      ...defaultSourceFilters(),
      kinds: new Set<"watch">(["watch"]),
    };
    expect(matchesSourceFilters(raphael, filters)).toBe(false);
    expect(matchesSourceFilters({ ...raphael, kind: "watch" }, filters)).toBe(
      true,
    );
  });
});

describe("selectedSummary", () => {
  it("says All when nothing is selected", () => {
    expect(selectedSummary(new Set<SourceKind>(), KIND_OPTIONS)).toBe("All");
  });

  it("lists the selected labels", () => {
    expect(selectedSummary(new Set(["watch"]), KIND_OPTIONS)).toBe("Watch");
  });
});

describe("describeSourcesFilters", () => {
  it("joins the active query and facets", () => {
    const filters = defaultSourceFilters();
    filters.q = "raph";
    filters.kinds = new Set(["watch"]);
    expect(describeSourcesFilters(filters)).toBe("raph · Watch");
  });
});
