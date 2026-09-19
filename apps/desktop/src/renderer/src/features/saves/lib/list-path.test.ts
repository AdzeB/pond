import { describe, expect, it } from "vitest";
import {
  getLastListPath,
  getLastListSearch,
  listPathForLocation,
  rememberListPath,
} from "./list-path";

describe("list-path", () => {
  it("remembers library list surfaces and ignores save/other sections", () => {
    rememberListPath("/trash");
    expect(getLastListPath()).toBe("/trash");

    rememberListPath("/save/abc");
    expect(getLastListPath()).toBe("/trash");

    rememberListPath("/sources");
    expect(getLastListPath()).toBe("/trash");

    rememberListPath("/downloads");
    expect(getLastListPath()).toBe("/downloads");

    rememberListPath("/");
    expect(getLastListPath()).toBe("/");
  });

  it("resolves list mode path while a save is open", () => {
    rememberListPath("/trash");
    expect(listPathForLocation("/save/xyz")).toBe("/trash");
    expect(listPathForLocation("/trash")).toBe("/trash");
  });

  it("remembers list search with the path", () => {
    rememberListPath("/", "?q=pond");
    expect(getLastListPath()).toBe("/");
    expect(getLastListSearch()).toBe("?q=pond");

    rememberListPath("/save/abc", "");
    expect(getLastListSearch()).toBe("?q=pond");
  });
});
