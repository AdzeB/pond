import { expect, it } from "vitest";
import { layoutCombinedImages } from "./combine-images-layout";

const base = {
  direction: "horizontal",
  alignment: "stretch",
  width: null,
  height: null,
  spacing: 0,
  margin: 0,
} as const;

it("stretches a horizontal row to the tallest image", () => {
  expect(
    layoutCombinedImages(
      [
        { width: 100, height: 50 },
        { width: 40, height: 100 },
      ],
      { ...base, spacing: 10, margin: 5 },
    ),
  ).toEqual({
    width: 200 + 40 + 10 + 10,
    height: 110,
    items: [
      { left: 5, top: 5, width: 200, height: 100 },
      { left: 215, top: 5, width: 40, height: 100 },
    ],
  });
});

it("keeps relative sizes and aligns a vertical stack to the end", () => {
  const layout = layoutCombinedImages(
    [
      { width: 100, height: 100 },
      { width: 50, height: 50 },
    ],
    { ...base, direction: "vertical", alignment: "end" },
  );
  expect(layout).toEqual({
    width: 100,
    height: 150,
    items: [
      { left: 0, top: 0, width: 100, height: 100 },
      { left: 50, top: 100, width: 50, height: 50 },
    ],
  });
});

it("fits the cross axis total inside the margin without scaling spacing", () => {
  const layout = layoutCombinedImages(
    [
      { width: 400, height: 300 },
      { width: 400, height: 300 },
    ],
    { ...base, direction: "vertical", width: 240, margin: 20, spacing: 10 },
  );
  expect(layout).toEqual({
    width: 240,
    height: 20 + 150 + 10 + 150 + 20,
    items: [
      { left: 20, top: 20, width: 200, height: 150 },
      { left: 20, top: 180, width: 200, height: 150 },
    ],
  });
});

it("derives the cross axis from a main axis total", () => {
  const layout = layoutCombinedImages(
    [
      { width: 400, height: 300 },
      { width: 400, height: 300 },
    ],
    { ...base, width: 420, margin: 5, spacing: 10 },
  );
  expect([layout.width, layout.height]).toEqual([420, 160]);
});
