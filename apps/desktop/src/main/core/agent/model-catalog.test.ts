import { expect, it } from "vitest";
import { bundledModels, mergeModelCatalogs } from "./model-catalog";

it.each([
  "openai",
  "anthropic",
  "gemini",
] as const)("provides %s models without a connection", async (provider) => {
  const models = await bundledModels(provider);
  expect(models.length).toBeGreaterThan(0);
  expect(models.every((model) => model.id && model.name)).toBe(true);
});

it.each([
  "ollama",
  "lmstudio",
  "compatible",
] as const)("does not claim models are installed on %s", async (provider) =>
  expect(await bundledModels(provider)).toEqual([]));

it("keeps bundled models while preferring discovered names and new IDs", () => {
  expect(
    mergeModelCatalogs(
      [
        { id: "known", name: "Known" },
        { id: "offline", name: "Offline" },
      ],
      [
        { id: "known", name: "Discovered name" },
        { id: "custom", name: "Custom" },
      ],
    ),
  ).toEqual([
    { id: "custom", name: "Custom" },
    { id: "known", name: "Discovered name" },
    { id: "offline", name: "Offline" },
  ]);
});
