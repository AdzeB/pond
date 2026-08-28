import {
  formatListKinds,
  mergeListKinds,
  normalizeListKinds,
} from "@pond/schema/list-kinds";
import { describe, expect, it } from "vitest";
import { listKindsFromTrigger } from "./list-kinds";

describe("mergeListKinds", () => {
  it("unions liked and saved in a stable order", () => {
    expect(mergeListKinds(["saved"], "liked")).toEqual(["liked", "saved"]);
    expect(mergeListKinds("liked", ["saved", "liked"])).toEqual([
      "liked",
      "saved",
    ]);
  });

  it("drops unknown values", () => {
    expect(normalizeListKinds(["liked", "nope", "bookmark"])).toEqual([
      "liked",
      "saved",
    ]);
  });
});

describe("formatListKinds", () => {
  it("returns null when empty", () => {
    expect(formatListKinds([])).toBeNull();
  });

  it("labels liked and saved", () => {
    expect(formatListKinds(["saved", "liked"])).toBe("Liked, Saved");
  });
});

describe("listKindsFromTrigger", () => {
  it("maps likes and upvotes to liked", () => {
    expect(listKindsFromTrigger("twitter:like")).toEqual(["liked"]);
    expect(listKindsFromTrigger("reddit:upvote")).toEqual(["liked"]);
    expect(listKindsFromTrigger("youtube:like")).toEqual(["liked"]);
  });

  it("maps bookmarks, saves, and the toolbar to saved", () => {
    expect(listKindsFromTrigger("twitter:bookmark")).toEqual(["saved"]);
    expect(listKindsFromTrigger("instagram:graphql-save")).toEqual(["saved"]);
    expect(listKindsFromTrigger("toolbar")).toEqual(["saved"]);
  });

  it("leaves sync and watch unstamped", () => {
    expect(listKindsFromTrigger("sync:twitter")).toEqual([]);
    expect(listKindsFromTrigger("watch:youtube")).toEqual([]);
  });
});
