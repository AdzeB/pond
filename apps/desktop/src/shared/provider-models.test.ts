import { expect, it } from "vitest";
import { displayName, modelsForChooser } from "./provider-models";

it("keeps the full catalog separate from picker visibility and preserves custom IDs", () => {
  const models = [
    { id: "first", name: "First" },
    { id: "second", name: "Second" },
  ];
  expect(modelsForChooser(models, undefined)).toEqual(models);
  expect(modelsForChooser(models, [])).toEqual([]);
  expect(
    modelsForChooser(models, ["second", "custom-model", "second"]),
  ).toEqual([
    { id: "second", name: "Second" },
    { id: "custom-model", name: "Custom Model" },
  ]);
  expect(models).toHaveLength(2);
});

it.each([
  ["claude-sonnet-4-6", "Claude Sonnet 4.6"],
  ["claude-haiku-4-5-20251001", "Claude Haiku 4.5 20251001"],
  ["gpt-4.1-mini", "GPT 4.1 Mini"],
  ["models/gemini-2.5-pro", "Gemini 2.5 Pro"],
])("formats model %s without losing version numbers", (id, name) => {
  expect(displayName(id)).toBe(name);
});
