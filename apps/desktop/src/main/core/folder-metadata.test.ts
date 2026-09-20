import { describe, expect, it } from "vitest";
import { normalizeFolderMetadata } from "./folder-metadata";

describe("folder metadata", () => {
  it("trims descriptions and normalizes web links", () => {
    expect(
      normalizeFolderMetadata({
        description: "  Reference material  ",
        externalLink: " https://example.com/project ",
      }),
    ).toEqual({
      description: "Reference material",
      externalLink: "https://example.com/project",
    });
  });

  it("stores empty metadata as null", () => {
    expect(
      normalizeFolderMetadata({ description: " ", externalLink: "" }),
    ).toEqual({ description: null, externalLink: null });
  });

  it("rejects non-web external links", () => {
    expect(() =>
      normalizeFolderMetadata({
        description: null,
        externalLink: "file:///tmp/project",
      }),
    ).toThrow("HTTP or HTTPS");
  });
});
