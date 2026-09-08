import { describe, expect, it } from "vitest";
import { handleFromMeData, pageFromLibrary, viewerFromMeData } from "./listing";

describe("viewerFromMeData", () => {
  it("reads the signed-in username and numeric id", () => {
    expect(
      viewerFromMeData({
        me: {
          id: 42,
          username: "jane",
          avatarUrl: "https://cdn.cosmos.so/jane.jpg",
        },
      }),
    ).toEqual({
      userId: "42",
      handle: "jane",
      avatarUrl: "https://cdn.cosmos.so/jane.jpg",
    });
  });

  it("strips a leading at-sign from the username", () => {
    expect(handleFromMeData({ me: { id: 1, username: "@jane" } })).toBe("jane");
  });

  it("returns null for logged-out payloads", () => {
    expect(viewerFromMeData({})).toBeNull();
    expect(viewerFromMeData({ me: null })).toBeNull();
    expect(viewerFromMeData({ me: { id: 1 } })).toBeNull();
    expect(viewerFromMeData({ me: { username: "jane" } })).toBeNull();
  });
});

describe("pageFromLibrary", () => {
  it("maps tiles to element URLs and follows the page cursor", () => {
    const page = pageFromLibrary({
      allElementsV2: {
        items: [
          {
            id: 11,
            shareUrl: "https://www.cosmos.so/e/11",
            createdAt: "2026-01-02T03:04:05.000Z",
          },
          { id: "12" },
        ],
        meta: { nextPageCursor: "cursor-2", count: 2 },
      },
    });
    expect(page.nextPageCursor).toBe("cursor-2");
    expect(page.entries).toEqual([
      {
        sourceId: "11",
        url: "https://www.cosmos.so/e/11",
        savedAt: "2026-01-02T03:04:05.000Z",
      },
      {
        sourceId: "12",
        url: "https://www.cosmos.so/e/12",
      },
    ]);
  });

  it("skips tiles without an id", () => {
    const page = pageFromLibrary({
      allElementsV2: {
        items: [{ shareUrl: "https://www.cosmos.so/e/missing" }],
      },
    });
    expect(page.entries).toEqual([]);
    expect(page.nextPageCursor).toBeNull();
  });
});
