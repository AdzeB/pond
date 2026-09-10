import { expect, it } from "vitest";
import { stepPlaybackRate, stepVolume } from "./lib";

it("steps through SPEED_OPTIONS without leaving the ladder", () => {
  expect(stepPlaybackRate(1, 1)).toBe(1.25);
  expect(stepPlaybackRate(1, -1)).toBe(0.75);
  expect(stepPlaybackRate(8, 1)).toBe(8);
  expect(stepPlaybackRate(0.25, -1)).toBe(0.25);
  expect(stepPlaybackRate(1.1, 1)).toBe(1.25);
  expect(stepPlaybackRate(1.1, -1)).toBe(1);
});

it("nudges volume by five percent and clamps", () => {
  expect(stepVolume(0.5, 0.05)).toBe(0.55);
  expect(stepVolume(0.98, 0.05)).toBe(1);
  expect(stepVolume(0.02, -0.05)).toBe(0);
});
