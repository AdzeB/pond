import { describe, expect, it } from "vitest";
import {
  agentModelOptionsFor,
  agentModelOptionsKey,
  contextChoicesFor,
  reasoningChoicesFor,
  resolveAgentRunControls,
  supportsNativeFast,
} from "./agent-model-options";
import type { ProviderModel } from "./provider-models";

describe("agent model options", () => {
  it("keeps settings independent for each provider and model", () => {
    const key = agentModelOptionsKey("openai", "gpt:test");
    expect(
      agentModelOptionsFor(
        {
          [key]: { fast: true, context: 256_000, reasoning: "high" },
        },
        "openai",
        "gpt:test",
      ),
    ).toEqual({ fast: true, context: 256_000, reasoning: "high" });
    expect(agentModelOptionsFor({}, "openai", "other")).toEqual({
      fast: false,
      context: "auto",
      reasoning: "provider-default",
    });
  });

  it("offers only context sizes and reasoning levels declared by the model", () => {
    const model: ProviderModel = {
      id: "gpt-test",
      name: "GPT Test",
      contextWindow: 200_000,
      reasoningOptions: ["low", "high"],
    };
    expect(contextChoicesFor(model.contextWindow)).toEqual([
      "auto",
      64_000,
      200_000,
    ]);
    expect(reasoningChoicesFor(model)).toEqual([
      "provider-default",
      "low",
      "high",
    ]);
  });

  it("requires verified metadata and a native provider for Fast", () => {
    const model = {
      id: "gpt-test",
      name: "GPT Test",
      capabilities: ["fast"],
    };
    expect(supportsNativeFast("openai", model)).toBe(true);
    expect(supportsNativeFast("ollama", model)).toBe(false);
    expect(supportsNativeFast("openai", { ...model, capabilities: [] })).toBe(
      false,
    );
  });

  it("clamps context and unsupported controls to catalog metadata", () => {
    expect(
      resolveAgentRunControls(
        { fast: true, context: 256_000, reasoning: "xhigh" },
        "openai",
        {
          id: "gpt-test",
          name: "GPT Test",
          contextWindow: 128_000,
          capabilities: ["fast"],
          reasoningOptions: ["high"],
        },
      ),
    ).toEqual({
      fast: true,
      contextTokens: 128_000,
      reasoning: "provider-default",
    });
  });
});
