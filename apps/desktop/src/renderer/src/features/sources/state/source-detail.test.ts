import { describe, expect, it } from "vitest";
import {
  parseSourceDetailPath,
  SourceDetailsPageSchema,
  sourceDetailHref,
} from "./source-detail";

describe("source detail paths", () => {
  it("round-trips a folder path through the URL", () => {
    const href = sourceDetailHref("folder", "/Users/me/Inbox");
    expect(href).toBe("/sources/folder/%2FUsers%2Fme%2FInbox");
    expect(parseSourceDetailPath(href)).toEqual({
      kind: "folder",
      id: "/Users/me/Inbox",
      page: undefined,
    });
  });

  it("keeps a known page and drops an unknown one", () => {
    expect(sourceDetailHref("account", "acc-1", "filters")).toBe(
      "/sources/account/acc-1?page=filters",
    );
    expect(
      parseSourceDetailPath("/sources/account/acc-1", "filters")?.page,
    ).toBe("filters");
    expect(SourceDetailsPageSchema.safeParse("nope").success).toBe(false);
  });

  it("ignores the list page and unknown kinds", () => {
    expect(parseSourceDetailPath("/sources")).toBeNull();
    expect(parseSourceDetailPath("/sources/unknown/acc-1")).toBeNull();
    expect(parseSourceDetailPath("/source/twitter")).toBeNull();
  });
});
