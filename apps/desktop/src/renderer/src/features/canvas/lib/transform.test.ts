import { describe, expect, it } from "vitest";
import { cornerAt, groupScale, resizeTurned, scaleBox } from "./transform";

const BOX = { x: 0, y: 0, width: 100, height: 50 };
const MIN = { width: 10, height: 10 };

function close(actual: { x: number; y: number }, x: number, y: number) {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
}

describe("resizeTurned", () => {
  it("matches a plain corner resize when upright", () => {
    expect(resizeTurned(BOX, 0, "se", { x: 150, y: 80 }, MIN, false)).toEqual({
      x: 0,
      y: 0,
      width: 150,
      height: 80,
    });
  });

  it("keeps the opposite corner fixed on screen when turned", () => {
    const anchor = cornerAt(BOX, 90, "nw");
    const dragged = cornerAt(BOX, 90, "se");
    const next = resizeTurned(
      BOX,
      90,
      "se",
      { x: dragged.x, y: dragged.y + 40 },
      MIN,
      false,
    );
    expect(next.width).toBeCloseTo(140);
    expect(next.height).toBeCloseTo(50);
    close(cornerAt(next, 90, "nw"), anchor.x, anchor.y);
  });

  it("stops at the minimum size and can keep the aspect ratio", () => {
    const tiny = resizeTurned(BOX, 30, "se", { x: -500, y: -500 }, MIN, false);
    expect(tiny.width).toBeCloseTo(10);
    expect(tiny.height).toBeCloseTo(10);
    const even = resizeTurned(BOX, 0, "se", { x: 200, y: 60 }, MIN, true);
    expect(even.width).toBeCloseTo(200);
    expect(even.height).toBeCloseTo(100);
  });
});

describe("groupScale", () => {
  const members = [{ width: 50, height: 50, min: { width: 25, height: 10 } }];

  it("scales from the opposite corner", () => {
    const scale = groupScale(BOX, "nw", { x: -100, y: -50 }, members, false);
    expect(scale).toEqual({ origin: { x: 100, y: 50 }, x: 2, y: 2 });
    expect(scaleBox({ x: 50, y: 0, width: 50, height: 50 }, scale)).toEqual({
      x: 0,
      y: -50,
      width: 100,
      height: 100,
    });
  });

  it("never shrinks a member below its minimum", () => {
    const scale = groupScale(BOX, "se", { x: 1, y: 1 }, members, false);
    expect(scale.x).toBeCloseTo(0.5);
    expect(scale.y).toBeCloseTo(0.2);
  });
});
