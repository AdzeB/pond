import { beforeEach, describe, expect, it, vi } from "vitest";
import { menuLabels } from "@/shared/test/menu-labels";
import { buildEmptyGalleryMenu } from "./empty-gallery-menu";

describe("empty gallery menu", () => {
  beforeEach(() => {
    vi.stubGlobal("pond", {
      query: vi.fn(async () => ({ kinds: [] })),
    });
  });
  it("shares the New menu spec", () => {
    const labels = menuLabels(buildEmptyGalleryMenu());
    expect(labels.slice(0, 2)).toEqual(["New", "New Folder"]);
    expect(labels).toContain("New Smart Folder");
    expect(labels).toContain("Find Duplicates");
    expect(labels).toContain("New Note");
    expect(labels).toContain("Rescan Library");
    expect(labels).toContain("Verify Integrity");
    expect(labels).toContain("Pinterest");
    expect(labels.join(" ")).toContain("ArtStation");
    expect(labels.join(" ")).toContain("Huaban");
    expect(labels.join(" ")).not.toContain("Plugin");
    expect(labels.join(" ")).not.toContain("…");
  });
});
