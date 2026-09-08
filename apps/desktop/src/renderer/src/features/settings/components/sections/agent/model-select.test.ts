import { expect, it } from "vitest";
import { groupModels, type ModelOption } from "./model-select";

const haiku: ModelOption = {
  id: "claude-haiku-4-5",
  name: "Claude Haiku 4.5",
  provider: "anthropic",
  providerName: "Anthropic",
};
const sonnet: ModelOption = {
  id: "claude-sonnet-4-6",
  name: "Claude Sonnet 4.6",
  provider: "anthropic",
  providerName: "Anthropic",
};
const gpt: ModelOption = {
  id: "gpt-4.1",
  name: "GPT 4.1",
  provider: "openai",
  providerName: "OpenAI",
};
const inherit: ModelOption = {
  id: "",
  name: "Use Language Model",
  provider: "",
  providerName: "",
};

it("groups models by provider in catalog order", () => {
  expect(groupModels([gpt, sonnet, haiku])).toEqual([
    { value: "Anthropic", provider: "anthropic", items: [haiku, sonnet] },
    { value: "OpenAI", provider: "openai", items: [gpt] },
  ]);
});

it("keeps a provider-less option above provider groups", () => {
  expect(groupModels([gpt, inherit, haiku])).toEqual([
    { value: "", provider: "", items: [inherit] },
    { value: "Anthropic", provider: "anthropic", items: [haiku] },
    { value: "OpenAI", provider: "openai", items: [gpt] },
  ]);
});
