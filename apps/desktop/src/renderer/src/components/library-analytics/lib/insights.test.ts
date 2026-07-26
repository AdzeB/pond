import type { InsightConfig } from "@pond/schema/db";
import { describe, expect, it } from "vitest";
import type { Save } from "@/lib/types";
import {
  applyFilters,
  computeInsight,
  isSavesInsight,
  savesInWindow,
  sizeOf,
} from "./insights";

const HOUR = 3_600_000;

function save(overrides: Partial<Save> = {}): Save {
  return {
    id: crypto.randomUUID(),
    source: "twitter",
    sourceId: "x",
    url: "https://x.com/some/post",
    title: "t",
    description: null,
    author: "Alice",
    notes: null,
    mediaUrl: null,
    mediaType: "image",
    files: [],
    fileSize: 1024,
    tags: [],
    savedAt: Date.now() - HOUR,
    createdAt: Date.now() - HOUR,
    deletedAt: null,
    ...overrides,
  } as Save;
}

function config(overrides: Partial<InsightConfig> = {}): InsightConfig {
  return {
    id: "c",
    name: null,
    slice: "source",
    segment: null,
    display: "chart",
    w: 2,
    h: 2,
    filters: [],
    ...overrides,
  };
}

describe("saves insight engine", () => {
  it("counts saves by source, excluding trashed", () => {
    const saves = [
      save(),
      save({ source: "reddit" }),
      save({ deletedAt: Date.now() }),
    ];
    const windowed = savesInWindow(saves, 7);
    expect(windowed).toHaveLength(2);

    const result = computeInsight(config(), windowed, 7);
    expect(result.total).toBe(2);
    expect(result.totalDisplay).toBe("2");
    expect(result.groups.map((g) => g.value)).toEqual([1, 1]);
  });

  it("caps high-cardinality slices with an Other bucket", () => {
    const saves = Array.from({ length: 20 }, (_, i) =>
      save({ author: `Creator ${i}` }),
    );
    const result = computeInsight(
      config({ slice: "creator", display: "chart" }),
      saves,
      7,
    );
    expect(result.groups).toHaveLength(8);
    expect(result.groups.at(-1)?.label).toMatch(/^Other/);
    expect(result.groups.reduce((a, g) => a + g.value, 0)).toBe(20);
  });

  it("buckets tags with multi-membership and untagged", () => {
    const saves = [
      save({ tags: ["art", "design"] }),
      save({ tags: ["art"] }),
      save({ tags: [] }),
    ];
    const result = computeInsight(config({ slice: "tag" }), saves, 7);
    const byLabel = new Map(result.groups.map((g) => [g.label, g.value]));
    expect(byLabel.get("art")).toBe(2);
    expect(byLabel.get("design")).toBe(1);
    expect(byLabel.get("Untagged")).toBe(1);
  });

  it("builds a 7x24 heatmap", () => {
    const saves = [save(), save(), save()];
    const heat = computeInsight(config({ display: "heatmap" }), saves, 7);
    expect(heat.heatmap?.cells).toHaveLength(7);
    expect(heat.heatmap?.cells[0]).toHaveLength(24);
    expect(heat.heatmap?.cells.flat().reduce((a, b) => a + b, 0)).toBe(3);
    expect(heat.heatmap?.max).toBe(3);
  });

  it("keeps circular shapes unsegmented except sunburst", () => {
    const saves = [
      save(),
      save({ mediaType: "video" }),
      save({ source: "reddit" }),
    ];
    for (const display of ["ring", "pie", "radar"] as const) {
      const result = computeInsight(
        config({ display, segment: "type" }),
        saves,
        7,
      );
      expect(result.legend).toHaveLength(0);
    }
    const sunburst = computeInsight(
      config({ display: "sunburst", segment: "type" }),
      saves,
      7,
    );
    expect(sunburst.legend.length).toBeGreaterThan(0);
    const twitter = sunburst.groups.find((g) => g.key === "twitter");
    expect(twitter?.segments.reduce((a, s) => a + s.value, 0)).toBe(2);
  });

  it("caps circular shapes at six groups", () => {
    const saves = Array.from({ length: 12 }, (_, i) =>
      save({ author: `Creator ${i}` }),
    );
    for (const display of ["pie", "sunburst"] as const) {
      const result = computeInsight(
        config({ display, slice: "creator" }),
        saves,
        7,
      );
      expect(result.groups).toHaveLength(6);
      expect(result.groups.at(-1)?.label).toMatch(/^Other/);
    }
  });

  it("segments day slices by source", () => {
    /** Noon today so `Date.now() - HOUR` never lands on yesterday near midnight. */
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const at = noon.getTime();
    const saves = [
      save({ savedAt: at, createdAt: at }),
      save({ savedAt: at, createdAt: at }),
      save({ source: "reddit", savedAt: at, createdAt: at }),
    ];
    const result = computeInsight(
      config({ slice: "day", segment: "source", display: "area" }),
      saves,
      7,
    );
    expect(result.legend.map((s) => s.key)).toEqual(["twitter", "reddit"]);
    const today = result.groups.at(-1);
    expect(today?.value).toBe(3);
    expect(today?.segments.map((s) => s.value)).toEqual([2, 1]);
  });

  it("applies include/exclude filters over save fields", () => {
    const saves = [
      save({ tags: ["keep"] }),
      save(),
      save({ source: "reddit" }),
    ];
    expect(
      applyFilters(saves, [{ field: "tag", op: "include", values: ["keep"] }]),
    ).toHaveLength(1);
    expect(
      applyFilters(saves, [
        { field: "source", op: "exclude", values: ["reddit"] },
      ]),
    ).toHaveLength(2);
  });

  it("drops cards from retired configurations", () => {
    expect(isSavesInsight(config())).toBe(true);
    /** Persisted cards may carry an explicit measure: "saves"; still valid. */
    expect(
      isSavesInsight({ ...config(), measure: "saves" } as InsightConfig),
    ).toBe(true);
    expect(
      isSavesInsight({
        ...config(),
        measure: "successRate",
        slice: "outcome",
      } as unknown as InsightConfig),
    ).toBe(false);
    expect(
      isSavesInsight({
        ...config(),
        measure: "storage",
      } as unknown as InsightConfig),
    ).toBe(false);
  });

  it("resolves grid spans with legacy width fallback", () => {
    expect(sizeOf(config({ w: 3, h: 1 }))).toEqual({ w: 3, h: 1 });
    expect(
      sizeOf(config({ w: undefined, h: undefined, width: "full" })),
    ).toEqual({ w: 3, h: 2 });
    expect(
      sizeOf(config({ w: undefined, h: undefined, display: "metric" })),
    ).toEqual({ w: 2, h: 1 });
  });
});
