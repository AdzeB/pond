import { queryIsFullySqlSupported } from "@pond/schema/filters";
import { matches } from "@pond/schema/filters/match";
import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import { parseSearchInput, serializeQuery } from "@/features/search/lib/syntax";
import {
  intersectSqlResults,
  needsFullPoolHydration,
  sortSaves,
} from "./use-filtered-saves";

function save(id: string): Save {
  return {
    id,
    source: "twitter",
    sourceId: id,
    url: "",
    title: null,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: null,
    files: [],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
}

describe("intersectSqlResults", () => {
  it("does not reintroduce filter matches outside the current search results", () => {
    const searchHits = [save("search-and-filter"), save("search-only")];

    expect(
      intersectSqlResults(searchHits, ["filter-only", "search-and-filter"]),
    ).toEqual([searchHits[0]]);
  });

  it("keeps the ordering returned by the SQL filter", () => {
    const first = save("first");
    const second = save("second");

    expect(intersectSqlResults([first, second], ["second", "first"])).toEqual([
      second,
      first,
    ]);
  });
});

describe("needsFullPoolHydration", () => {
  it("keeps the paged fast path only for the default recency order", () => {
    expect(needsFullPoolHydration(true, false, "savedAt", "desc")).toBe(false);
    expect(needsFullPoolHydration(true, false, "title", "asc")).toBe(true);
    expect(needsFullPoolHydration(true, false, "savedAt", "asc")).toBe(true);
  });

  it("hydrates client-only filters but trusts complete SQL query results", () => {
    expect(needsFullPoolHydration(false, false, "savedAt", "desc")).toBe(true);
    expect(needsFullPoolHydration(false, true, "title", "asc")).toBe(false);
  });
});

describe("sortSaves", () => {
  it("orders the expanded library details while keeping missing values last", () => {
    const tagged = {
      ...save("tagged"),
      tags: ["zebra", "alpha"],
      publishedAt: 200,
      width: 200,
      height: 100,
      rawJson: {
        capture: {
          id: "tagged",
          source: "twitter" as const,
          url: "https://x.com/tagged",
          media: [],
          duration: 60,
        },
        extractorId: "test",
        extractedAt: "2026-01-01T00:00:00.000Z",
      },
    };
    const untagged = { ...save("untagged"), tags: [] };
    const longer = {
      ...save("longer"),
      tags: ["beta"],
      publishedAt: 100,
      width: 300,
      height: 100,
      rawJson: {
        capture: {
          id: "longer",
          source: "twitter" as const,
          url: "https://x.com/longer",
          media: [],
          duration: 120,
        },
        extractorId: "test",
        extractedAt: "2026-01-01T00:00:00.000Z",
      },
    };

    expect(sortSaves([tagged, longer, untagged], "tagName", "asc")).toEqual([
      tagged,
      longer,
      untagged,
    ]);
    expect(sortSaves([tagged, longer, untagged], "duration", "desc")).toEqual([
      longer,
      tagged,
      untagged,
    ]);
    expect(
      sortSaves([tagged, longer, untagged], "aspectRatio", "desc"),
    ).toEqual([longer, tagged, untagged]);
    expect(sortSaves([tagged, longer, untagged], "publishedAt", "asc")).toEqual(
      [longer, tagged, untagged],
    );
  });
});

describe("queryIsFullySqlSupported", () => {
  it("compiles source filters to SQL", () => {
    expect(
      queryIsFullySqlSupported({
        combinator: "and",
        rules: [{ field: "source", operator: "eq", value: "instagram.com" }],
      }),
    ).toBe(true);
  });

  it("compiles mixed queries that include a source predicate", () => {
    expect(
      queryIsFullySqlSupported({
        combinator: "and",
        rules: [
          { field: "type", operator: "eq", value: "video" },
          {
            combinator: "or",
            rules: [
              { field: "source", operator: "eq", value: "instagram.com" },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  it("allows projected fields and the special tags projection", () => {
    expect(
      queryIsFullySqlSupported({
        combinator: "and",
        rules: [
          { field: "type", operator: "eq", value: "video" },
          { field: "tags", operator: "some", value: ["design"] },
        ],
      }),
    ).toBe(true);
  });

  it("compiles list filters to SQL", () => {
    expect(
      queryIsFullySqlSupported({
        combinator: "and",
        rules: [{ field: "list", operator: "some", value: ["liked"] }],
      }),
    ).toBe(true);
  });

  it("compiles account filters to SQL", () => {
    expect(
      queryIsFullySqlSupported({
        combinator: "and",
        rules: [
          {
            field: "account",
            operator: "eq",
            value: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          },
        ],
      }),
    ).toBe(true);
  });
});

describe("structured source search", () => {
  it("matches the requested domain and excludes other platforms", () => {
    const parsed = parseSearchInput("source:instagram.com");
    const query = { combinator: "and" as const, rules: parsed.predicates };

    expect(parsed.text).toBe("");
    expect(
      matches(query, {
        id: "instagram-save",
        source: "instagram",
        url: "https://www.instagram.com/p/example",
      }),
    ).toBe(true);
    expect(
      matches(query, {
        id: "tiktok-save",
        source: "tiktok",
        url: "https://www.tiktok.com/@example/video/1",
      }),
    ).toBe(false);
  });
});

describe("structured list search", () => {
  it("matches liked items that are also saved", () => {
    const parsed = parseSearchInput("list:liked");
    const query = { combinator: "and" as const, rules: parsed.predicates };

    expect(parsed.predicates).toEqual([
      { field: "list", operator: "some", value: ["liked"] },
    ]);
    expect(
      matches(query, {
        id: "both",
        source: "twitter",
        url: "https://x.com/a/status/1",
        listKinds: ["liked", "saved"],
      }),
    ).toBe(true);
    expect(
      matches(query, {
        id: "saved-only",
        source: "twitter",
        url: "https://x.com/a/status/2",
        listKinds: ["saved"],
      }),
    ).toBe(false);
  });

  it("treats bookmark as saved", () => {
    const parsed = parseSearchInput("list:bookmark");
    expect(parsed.predicates).toEqual([
      { field: "list", operator: "some", value: ["saved"] },
    ]);
  });
});

describe("structured account search", () => {
  const ulid = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

  it("matches an account id regardless of ULID case", () => {
    const parsed = parseSearchInput(`account:${ulid}`);
    const query = { combinator: "and" as const, rules: parsed.predicates };

    expect(parsed.text).toBe("");
    expect(parsed.predicates).toEqual([
      { field: "account", operator: "eq", value: ulid.toLowerCase() },
    ]);
    expect(
      matches(query, {
        id: "owned",
        accountId: ulid,
        source: "instagram",
        url: "https://www.instagram.com/p/owned",
      }),
    ).toBe(true);
    expect(
      matches(query, {
        id: "other",
        accountId: "01BX5ZZKBKACTAV9WEVGEMMVRZ",
        source: "instagram",
        url: "https://www.instagram.com/p/other",
      }),
    ).toBe(false);
  });

  it("round-trips an account predicate through search syntax", () => {
    const query = {
      combinator: "and" as const,
      rules: [
        { field: "account" as const, operator: "eq" as const, value: ulid },
      ],
    };
    expect(parseSearchInput(serializeQuery(query))).toEqual({
      predicates: [
        { field: "account", operator: "eq", value: ulid.toLowerCase() },
      ],
      text: "",
    });
  });
});
