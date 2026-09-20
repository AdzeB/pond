import { describe, expect, it } from "vitest";
import {
  buildTagNav,
  filterByNav,
  parseTagBatch,
  partitionPickerTags,
  partitionRecent,
} from "./lib";

describe("partitionRecent", () => {
  it("splits by lastUsedAt and sorts recent newest first", () => {
    const tags = [
      { name: "Zebra", lastUsedAt: 10 },
      { name: "Alpha", lastUsedAt: null },
      { name: "Beta", lastUsedAt: 30 },
      { name: "Gamma", lastUsedAt: 20 },
    ];
    expect(partitionRecent(tags)).toEqual({
      recent: [
        { name: "Beta", lastUsedAt: 30 },
        { name: "Gamma", lastUsedAt: 20 },
        { name: "Zebra", lastUsedAt: 10 },
      ],
      others: [{ name: "Alpha", lastUsedAt: null }],
    });
  });
});

describe("filterByNav", () => {
  const tags = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const grouped = new Set(["a", "b"]);
  const groups = new Map<string, ReadonlySet<string>>([
    ["design", new Set(["a"])],
  ]);

  it("returns every tag for all", () => {
    expect(filterByNav(tags, "all", grouped, groups)).toEqual(tags);
  });

  it("returns ungrouped tags for uncategorized", () => {
    expect(filterByNav(tags, "uncategorized", grouped, groups)).toEqual([
      { id: "c" },
    ]);
  });

  it("returns a group's members", () => {
    expect(filterByNav(tags, "design", grouped, groups)).toEqual([{ id: "a" }]);
  });
});

describe("buildTagNav", () => {
  it("always leads with All and omits empty Uncategorized", () => {
    expect(buildTagNav(4, [{ id: "g1", name: "Design", count: 1 }], 0)).toEqual(
      [
        { id: "all", kind: "all", label: "All", count: 4 },
        { id: "g1", kind: "group", label: "Design", count: 1 },
      ],
    );
  });

  it("appends Uncategorized when any tag is ungrouped", () => {
    const nav = buildTagNav(4, [], 3);
    expect(nav.at(-1)).toEqual({
      id: "uncategorized",
      kind: "uncategorized",
      label: "Uncategorized",
      count: 3,
    });
  });
});

it("keeps starred tags first without repeating them among recent or other tags", () => {
  const tags = [
    { name: "Recent", starred: false, lastUsedAt: 20 },
    { name: "Favorite", starred: true, lastUsedAt: 10 },
    { name: "Other", starred: false, lastUsedAt: null },
    { name: "Always", starred: true, lastUsedAt: null },
  ];
  const result = partitionPickerTags(tags);
  expect(result.starred.map((tag) => tag.name)).toEqual(["Always", "Favorite"]);
  expect(result.recent.map((tag) => tag.name)).toEqual(["Recent"]);
  expect(result.others.map((tag) => tag.name)).toEqual(["Other"]);
});

it("separates recommended tags without repeating starred tags", () => {
  const tags = [
    { name: "Favorite", starred: true, lastUsedAt: null },
    { name: "Suggested", starred: false, lastUsedAt: 20 },
    { name: "Other", starred: false, lastUsedAt: null },
  ];
  const result = partitionPickerTags(tags, new Set(["suggested", "favorite"]));
  expect(result.starred.map((tag) => tag.name)).toEqual(["Favorite"]);
  expect(result.recommended.map((tag) => tag.name)).toEqual(["Suggested"]);
  expect(result.recent).toEqual([]);
  expect(result.others.map((tag) => tag.name)).toEqual(["Other"]);
});

it("parses comma and newline batches with quoted commas and case-insensitive deduplication", () => {
  expect(parseTagBatch('Design, "Type, Foundry"\nPhoto, design')).toEqual([
    "Design",
    "Type, Foundry",
    "Photo",
  ]);
});
