import { describe, expect, it } from "vitest";
import { loadAdapter } from "./adapter";

describe("loadAdapter", () => {
  it.each([
    "openai",
    "anthropic",
    "gemini",
    "ollama",
  ] as const)("preserves runtime-selected model IDs for %s", async (provider) => {
    const adapter = await loadAdapter({
      provider,
      model: "pond-custom-model",
      apiKey: "offline-test-key",
    });
    expect(adapter?.model).toBe("pond-custom-model");
  });

  it.each([
    "lmstudio",
    "compatible",
  ] as const)("uses the compatible API for %s models", async (provider) => {
    const adapter = await loadAdapter({
      provider,
      model: "local/model:quantized",
      apiKey: null,
      baseUrl: "http://127.0.0.1:1234/v1",
    });
    expect(adapter?.name).toBe("openai-compatible");
    expect(adapter?.model).toBe("local/model:quantized");
  });

  it("does not route an unconfigured custom endpoint to OpenAI", async () => {
    await expect(
      loadAdapter({ provider: "compatible", model: "custom", apiKey: null }),
    ).rejects.toThrow("Configure an API base URL");
  });
});
