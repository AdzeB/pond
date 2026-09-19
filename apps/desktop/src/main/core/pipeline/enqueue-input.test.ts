import { describe, expect, it } from "vitest";
import { normalizeEnqueueItems, normalizeUrl } from "./enqueue-input";

describe("normalizeUrl", () => {
  it("removes fragments and tracking parameters without changing content parameters", () => {
    expect(
      normalizeUrl(
        "https://example.com/post?id=42&utm_source=feed&fbclid=abc#comments",
      ),
    ).toBe("https://example.com/post?id=42");
  });

  it("returns invalid input unchanged", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });
});

describe("normalizeEnqueueItems", () => {
  it("deduplicates source identities and merges list kinds in input order", () => {
    const result = normalizeEnqueueItems(
      [
        {
          url: "https://www.youtube.com/watch?v=video-id&si=tracking",
          listKinds: ["liked"],
        },
        {
          url: "https://www.youtube.com/watch?v=video-id",
          listKinds: ["saved"],
        },
      ],
      undefined,
    );

    expect(result.failed).toBe(0);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      url: "https://www.youtube.com/watch?v=video-id",
      source: "youtube",
      sourceId: "video-id",
      listKinds: ["liked", "saved"],
    });
  });

  it("counts unsupported inputs without dropping valid candidates", () => {
    const result = normalizeEnqueueItems(
      [
        { url: "mailto:person@example.com" },
        { url: "https://example.com/article" },
      ],
      "toolbar",
    );

    expect(result.failed).toBe(1);
    expect(result.candidates).toMatchObject([
      {
        source: "web",
        listKinds: ["saved"],
      },
    ]);
  });
});
