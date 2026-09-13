// @vitest-environment jsdom
import type { MenuItemSpec } from "@pond/ui";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { buildEmptyGalleryMenu } from "./empty-gallery-menu";

function labels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if (item.type === "submenu") {
      const label = z.string().safeParse(item.label);
      return label.success
        ? [label.data, ...labels(item.items)]
        : labels(item.items);
    }
    const parsed = z.string().safeParse("label" in item ? item.label : null);
    return parsed.success ? [parsed.data] : [];
  });
}

describe("empty gallery menu", () => {
  beforeEach(() => {
    vi.stubGlobal("pond", {
      query: vi.fn(async () => ({ kinds: [] })),
    });
  });
  it("shares the New menu spec", () => {
    const menuLabels = labels(buildEmptyGalleryMenu());
    expect(menuLabels[0]).toBe("New Folder");
    expect(menuLabels).toContain("New Smart Folder");
    expect(menuLabels).toContain("Find Duplicates");
    expect(menuLabels).toContain("New Note");
    expect(menuLabels).toContain("Pinterest");
    expect(menuLabels.join(" ")).not.toContain("ArtStation");
    expect(menuLabels.join(" ")).not.toContain("Plugin");
    expect(menuLabels.join(" ")).not.toContain("…");
  });
});
