import { expect, it } from "vitest";
import { modelsForChooser } from "./provider-models";

const models = [
  { id: "one", name: "One" },
  { id: "two", name: "Two" },
];
it("preserves all discovered models before customization", () => {
  expect(modelsForChooser(models, undefined)).toEqual(models);
});
it("limits the chooser to enabled IDs and retains custom models", () => {
  expect(modelsForChooser(models, ["two", "custom", "two"])).toEqual([
    models[1],
    { id: "custom", name: "Custom" },
  ]);
});
it("allows hiding every model without restoring defaults", () => {
  expect(modelsForChooser(models, [])).toEqual([]);
});
