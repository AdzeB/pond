import { describe, expect, it } from "vitest";
import { moveOrderedItem } from "./order";

describe("manual folder order", () => {
  it("moves an item to either end without changing the source or membership", () => {
    const source = ["a", "b", "c", "d"];
    expect(moveOrderedItem(source, "b", 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveOrderedItem(source, "d", -1)).toEqual(["d", "a", "b", "c"]);
    expect(source).toEqual(["a", "b", "c", "d"]);
  });
  it("ignores a dropped item from another folder", () => {
    expect(moveOrderedItem(["a", "b"], "outside", 0)).toEqual(["a", "b"]);
  });
});
