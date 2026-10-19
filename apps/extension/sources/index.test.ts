import { describe, expect, it } from "vitest";
import {
  HOOK_MATCHES,
  HOOK_SOURCE_IDS,
  HOOK_SOURCES,
  hookSourceForUrl,
  isLikeTrigger,
} from ".";

describe("hook sources", () => {
  it("finds the source for a page on its site", () => {
    expect(hookSourceForUrl("https://x.com/home")).toBe("twitter");
    expect(hookSourceForUrl("https://www.reddit.com/r/design/")).toBe("reddit");
    expect(hookSourceForUrl("https://www.youtube.com/watch?v=1")).toBe(
      "youtube",
    );
  });

  it("ignores pages no hook covers", () => {
    expect(hookSourceForUrl("https://example.com/")).toBeNull();
  });

  it("registers match patterns for every external source", () => {
    for (const source of HOOK_SOURCE_IDS) {
      expect(HOOK_SOURCES[source].matches.length).toBeGreaterThan(0);
    }
    expect(HOOK_MATCHES).toContain("https://x.com/*");
  });

  it("tells likes apart from saves", () => {
    expect(isLikeTrigger("reddit", "reddit:upvote")).toBe(true);
    expect(isLikeTrigger("reddit", "reddit:save")).toBe(false);
  });
});
