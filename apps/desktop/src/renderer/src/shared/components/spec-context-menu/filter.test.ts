import type { MenuItemSpec } from "@pond/ui";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { filterMenuItems } from "./filter";

function labels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    const parsed = z.string().safeParse("label" in item ? item.label : null);
    const label = parsed.success ? [parsed.data] : [];
    if (item.type === "group" || item.type === "submenu") {
      return [...label, ...labels(item.items)];
    }
    return label;
  });
}

const MENU: MenuItemSpec[] = [
  { label: "Open Save", onClick: () => {} },
  { type: "separator" },
  {
    type: "submenu",
    label: "Export",
    items: [
      { label: "Export Files", onClick: () => {} },
      { label: "Export to CSV", onClick: () => {} },
      { label: "Hidden Format", hidden: true, onClick: () => {} },
      { label: "Disabled Pack", disabled: true, onClick: () => {} },
    ],
  },
  {
    label: "Reveal in Finder",
    keywords: "explorer",
    onClick: () => {},
  },
  { type: "custom", render: () => null },
];

describe("filterMenuItems", () => {
  it("returns the original tree when the query is empty", () => {
    expect(filterMenuItems(MENU, "")).toBe(MENU);
    expect(filterMenuItems(MENU, "   ")).toBe(MENU);
  });

  it("flattens nested Export to CSV under Export", () => {
    const result = filterMenuItems(MENU, "csv");
    expect(labels(result)).toEqual(["Export", "Export to CSV"]);
    expect(result[0]).toMatchObject({ type: "group", label: "Export" });
  });

  it("drops separators, hidden rows, and disabled rows", () => {
    const result = filterMenuItems(MENU, "export");
    expect(labels(result)).toEqual(["Export", "Export Files", "Export to CSV"]);
    expect(result.some((item) => item.type === "separator")).toBe(false);
  });

  it("matches keywords on a leaf", () => {
    expect(labels(filterMenuItems(MENU, "explorer"))).toEqual([
      "Reveal in Finder",
    ]);
  });

  it("keeps color swatches when the query names them", () => {
    const result = filterMenuItems(MENU, "color");
    expect(result).toEqual([expect.objectContaining({ type: "custom" })]);
  });
});
