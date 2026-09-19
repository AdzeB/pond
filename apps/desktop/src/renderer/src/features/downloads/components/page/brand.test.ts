import { describe, expect, it } from "vitest";
import { downloadBrandSource } from "./brand";

describe("downloadBrandSource", () => {
  it("uses the URL host when harvest stored the save as web", () => {
    expect(downloadBrandSource("web", "https://www.youtube.com/")).toBe(
      "youtube",
    );
  });

  it("keeps the stored source when the host is unknown", () => {
    expect(downloadBrandSource("instagram", "https://example.com/p")).toBe(
      "instagram",
    );
  });
});
