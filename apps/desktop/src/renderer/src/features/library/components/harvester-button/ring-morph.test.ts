import { describe, expect, it } from "vitest";
import { MARK_CENTER, morphLoop, samplePath } from "./ring-morph";

describe("harvester ring morph", () => {
  const loop = [
    { x: MARK_CENTER + 40, y: MARK_CENTER },
    { x: MARK_CENTER, y: MARK_CENTER - 10 },
  ];

  it("keeps the source loop at full mark weight", () => {
    expect(morphLoop(loop, 80, 1)).toBe(
      `M${(MARK_CENTER + 40).toFixed(2)} ${MARK_CENTER.toFixed(2)}L${MARK_CENTER.toFixed(2)} ${(MARK_CENTER - 10).toFixed(2)}Z`,
    );
  });

  it("lands every point on the circle along its own angle", () => {
    expect(morphLoop(loop, 80, 0)).toBe(
      `M${(MARK_CENTER + 80).toFixed(2)} ${MARK_CENTER.toFixed(2)}L${MARK_CENTER.toFixed(2)} ${(MARK_CENTER - 80).toFixed(2)}Z`,
    );
  });

  it("samples a closed outline evenly by length", () => {
    expect(samplePath("M0 0H10V10H0Z", 8)).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
      { x: 5, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 5 },
    ]);
  });
});
