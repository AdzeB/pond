import { describe, expect, it } from "vitest";
import { listAppIconPreviews } from "./app-icon-previews";

describe("app icon previews", () => {
  it("lists bundled tint images with aqua first", () => {
    const icons = listAppIconPreviews();
    expect(icons.length).toBeGreaterThan(0);
    expect(icons[0]?.id).toBe("aqua");
    expect(icons.every((icon) => icon.preview.length > 0)).toBe(true);
    expect(icons.find((icon) => icon.id === "mocha")?.tint).toMatch(
      /^#[0-9a-f]{6}$/,
    );
    expect(icons.map((icon) => icon.id)).toEqual(
      expect.arrayContaining(["aqua", "mocha", "maraschino"]),
    );
  });
});
