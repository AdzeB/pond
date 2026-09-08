import { expect, it } from "vitest";
import { displayName } from "./provider-models";

it.each([
  ["claude-sonnet-4-6", "Claude Sonnet 4.6"],
  ["claude-haiku-4-5-20251001", "Claude Haiku 4.5 20251001"],
  ["gpt-4.1-mini", "GPT 4.1 Mini"],
  ["models/gemini-2.5-pro", "Gemini 2.5 Pro"],
])("formats model %s without losing version numbers", (id, name) => {
  expect(displayName(id)).toBe(name);
});
