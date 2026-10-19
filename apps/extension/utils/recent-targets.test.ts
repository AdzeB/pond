import { describe, expect, it } from "vitest";
import { pushRecent } from "./recent-targets";

describe("pushRecent", () => {
  it("puts what was just used first and drops older copies", () => {
    expect(pushRecent(["a", "b", "c"], ["c", "d"], 10)).toEqual([
      "c",
      "d",
      "a",
      "b",
    ]);
  });

  it("caps the list", () => {
    expect(pushRecent(["a", "b", "c"], ["d"], 2)).toEqual(["d", "a"]);
  });

  it("keeps each value once when the same value is used twice", () => {
    expect(pushRecent([], ["a", "a"], 5)).toEqual(["a"]);
  });
});
