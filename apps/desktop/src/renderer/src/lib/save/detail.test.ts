import { describe, expect, it } from "vitest";
import type { Save } from "@/lib/types";
import {
  type DetailRow,
  groupDetailRows,
  isSameTitleAndContent,
  pickAuthorProfileUrl,
} from "./detail";

function row(id: string, label = id): DetailRow {
  return { id, label, value: id, kind: "text" };
}

describe("groupDetailRows", () => {
  it("splits identity, file, and dates into separate islands", () => {
    const groups = groupDetailRows([
      row("id", "ID"),
      row("author", "Author"),
      row("platform", "Platform"),
      row("type", "Type"),
      row("size", "Size"),
      row("published", "Published"),
      row("imported", "Imported"),
    ]);

    expect(groups.map((g) => g.title)).toEqual(["Properties", "File", "Dates"]);
    expect(groups[0]?.rows.map((r) => r.id)).toEqual([
      "author",
      "platform",
      "type",
    ]);
    expect(groups[1]?.rows.map((r) => r.id)).toEqual(["size", "id"]);
    expect(groups[2]?.rows.map((r) => r.id)).toEqual(["published", "imported"]);
  });

  it("omits empty islands", () => {
    const groups = groupDetailRows([row("author", "Author")]);
    expect(groups.map((g) => g.title)).toEqual(["Properties"]);
  });
});

describe("isSameTitleAndContent", () => {
  it("treats a title that is the content plus a url as the same", () => {
    expect(
      isSameTitleAndContent(
        "make loading the page feel faster https://t.co/kw5abc",
        "make loading the page feel faster",
      ),
    ).toBe(true);
  });

  it("keeps a distinct title", () => {
    expect(
      isSameTitleAndContent("Screenlife - Wikipedia", "A short article body"),
    ).toBe(false);
  });
});

describe("pickAuthorProfileUrl", () => {
  it("uses the captured profile url", () => {
    expect(
      pickAuthorProfileUrl({
        source: "instagram",
        rawJson: {
          capture: {
            id: "p",
            source: "instagram",
            url: "https://www.instagram.com/p/abc/",
            media: [],
            author: {
              handle: "other",
              profileUrl: "https://www.instagram.com/sofinna/",
            },
          },
          extractorId: "test",
          extractedAt: "2026-01-01T00:00:00.000Z",
        },
      } as Save),
    ).toBe("https://www.instagram.com/sofinna/");
  });

  it("reconstructs an instagram profile from handle when the capture has none", () => {
    expect(
      pickAuthorProfileUrl({
        source: "instagram",
        rawJson: {
          capture: {
            id: "p",
            source: "instagram",
            url: "https://www.instagram.com/p/abc/",
            media: [],
            author: { handle: "@sofinna" },
          },
          extractorId: "test",
          extractedAt: "2026-01-01T00:00:00.000Z",
        },
      } as Save),
    ).toBe("https://www.instagram.com/sofinna/");
  });

  it("uses the youtube channel url from ytdlp", () => {
    expect(
      pickAuthorProfileUrl({
        source: "youtube",
        rawJson: {
          capture: {
            id: "v",
            source: "youtube",
            url: "https://www.youtube.com/watch?v=abc",
            media: [],
          },
          ytdlp: { channel_url: "https://www.youtube.com/@nasa" },
          extractorId: "test",
          extractedAt: "2026-01-01T00:00:00.000Z",
        },
      } as Save),
    ).toBe("https://www.youtube.com/@nasa");
  });

  it("ignores non-http profile urls", () => {
    expect(
      pickAuthorProfileUrl({
        source: "instagram",
        rawJson: {
          capture: {
            id: "p",
            source: "instagram",
            url: "https://www.instagram.com/p/abc/",
            media: [],
            author: { profileUrl: "javascript:alert(1)" },
          },
          extractorId: "test",
          extractedAt: "2026-01-01T00:00:00.000Z",
        },
      } as Save),
    ).toBeNull();
  });
});
