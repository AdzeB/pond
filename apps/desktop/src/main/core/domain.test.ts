import {
  canonicalHost,
  domainFromUrl,
  sourceIdentity,
} from "@pond/schema/domain";
import { describe, expect, it } from "vitest";

describe("canonicalHost", () => {
  it("strips www and lowercases", () => {
    expect(canonicalHost("www.Dribbble.com")).toBe("dribbble.com");
  });

  it("collapses twitter aliases to the descriptor primary host", () => {
    expect(canonicalHost("twitter.com")).toBe("x.com");
    expect(canonicalHost("www.x.com")).toBe("x.com");
  });

  it("collapses youtube short host", () => {
    expect(canonicalHost("youtu.be")).toBe("youtube.com");
  });
});

describe("domainFromUrl", () => {
  it("returns null for invalid urls", () => {
    expect(domainFromUrl("not a url")).toBeNull();
    expect(domainFromUrl(null)).toBeNull();
  });

  it("parses and canonicalizes", () => {
    expect(domainFromUrl("https://www.instagram.com/p/abc")).toBe(
      "instagram.com",
    );
  });
});

describe("sourceIdentity", () => {
  it("prefers siteName", () => {
    expect(
      sourceIdentity({
        siteName: "Dribbble.com",
        source: "web",
        url: "https://other.com",
      }),
    ).toBe("dribbble.com");
  });

  it("uses local for local imports", () => {
    expect(
      sourceIdentity({ siteName: null, source: "local", url: "pond:local/1" }),
    ).toBe("local");
  });

  it("falls back to url domain", () => {
    expect(
      sourceIdentity({
        siteName: null,
        source: "web",
        url: "https://www.are.na/block/1",
      }),
    ).toBe("are.na");
  });
});
