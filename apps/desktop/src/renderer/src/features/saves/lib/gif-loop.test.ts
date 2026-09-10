import { describe, expect, it } from "vitest";
import { gifLoopRange, nextGifFrame } from "./gif-loop";

describe("gifLoopRange", () => {
  it("orders start and end so playback can wrap", () => {
    expect(gifLoopRange(3, 8)).toEqual([3, 8]);
    expect(gifLoopRange(8, 3)).toEqual([3, 8]);
    expect(gifLoopRange(0, 0)).toEqual([0, 0]);
  });
});

describe("nextGifFrame", () => {
  it("wraps through the full GIF when no loop is set", () => {
    expect(nextGifFrame(0, 4, null)).toBe(1);
    expect(nextGifFrame(3, 4, null)).toBe(0);
  });

  it("wraps inside an inclusive loop range", () => {
    expect(nextGifFrame(2, 10, [2, 5])).toBe(3);
    expect(nextGifFrame(5, 10, [2, 5])).toBe(2);
    expect(nextGifFrame(0, 10, [2, 5])).toBe(3);
  });

  it("holds a single-frame loop", () => {
    expect(nextGifFrame(4, 10, [4, 4])).toBe(4);
  });
});
