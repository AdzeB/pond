import { expect, it } from "vitest";
import { saveDragIconSvg } from "./save-drag-icon";

it("builds a layered native drag icon with a selection count", () => {
  const svg = saveDragIconSvg(
    ["data:image/png;base64,one", "data:image/png;base64,two"],
    12,
  );

  expect(svg).toContain('width="96"');
  expect(svg).toContain("data:image/png;base64,one");
  expect(svg).toContain("data:image/png;base64,two");
  expect(svg).toContain(">12</text>");
});

it("caps the visible count and renders a fallback card", () => {
  const svg = saveDragIconSvg([], 1200);
  expect(svg).toContain(">999+</text>");
  expect(svg).toContain('fill="#d7d7da"');
});
