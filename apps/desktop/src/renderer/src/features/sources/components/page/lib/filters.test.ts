import { describe, expect, it } from "vitest";
import {
  defaultSourceFilters,
  type FilterableSource,
  matchesSourceFilters,
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

  it("shows every row when no search is set", () => {
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
});
