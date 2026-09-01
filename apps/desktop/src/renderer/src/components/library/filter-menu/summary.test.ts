import { expect, it } from "vitest";
import { choiceOptions, presetOptions } from "./options";
import { filterSummary } from "./summary";

it("summarizes multiple types and negative filters using their display labels", () => {
  const options = presetOptions("type");
  expect(
    filterSummary(
      [{ field: "type", operator: "in", value: ["image", "video"] }],
      options,
    ),
  ).toBe("Image, Video");
  expect(
    filterSummary(
      [{ field: "type", operator: "nin", value: ["video"] }],
      options,
    ),
  ).toBe("Not Video");
  expect(
    filterSummary(
      [{ field: "type", operator: "eq", value: "video", negate: true }],
      options,
    ),
  ).toBe("Not Video");
});

it("keeps folder labels when selected through typed syntax", () => {
  expect(
    filterSummary(
      [{ field: "folder", operator: "some", value: ["FOLDER-A", "folder-b"] }],
      choiceOptions("folder", [
        { label: "Design", value: "folder-a" },
        { label: "Motion", value: "folder-b" },
      ]),
    ),
  ).toBe("Design, Motion");
});

it("does not invert absent notes or numeric exclusions twice", () => {
  expect(
    filterSummary(
      [{ field: "note", operator: "exists", value: false }],
      presetOptions("note"),
    ),
  ).toBe("Without Note");
  expect(
    filterSummary(
      [{ field: "fileCount", operator: "neq", value: 2 }],
      presetOptions("fileCount"),
    ),
  ).toBe("≠ 2");
});
