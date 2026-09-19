import { describe, expect, it } from "vitest";
import { z } from "zod";
import { loadModel } from "./adapter";

const loadedModel = z.object({
  modelId: z.string(),
  provider: z.string(),
});

describe("loadModel", () => {
  it.each([
    "openai",
    "anthropic",
    "gemini",
    "deepseek",
    "ollama",
    "xai",
    "mistral",
    "groq",
  ] as const)(
    "preserves runtime-selected model IDs for %s",
    async (provider) => {
      const model = loadedModel.safeParse(
        await loadModel({
          provider,
          model: "pond-custom-model",
          apiKey: "offline-test-key",
        }),
      );
      expect(model.success && model.data.modelId).toBe("pond-custom-model");
    },
  );

  it("uses the compatible API for LM Studio models", async () => {
    const model = loadedModel.safeParse(
      await loadModel({
        provider: "lmstudio",
        model: "local/model:quantized",
        apiKey: null,
        baseUrl: "http://127.0.0.1:1234/v1",
      }),
    );
    expect(model.success && model.data.provider).toContain("lmstudio");
    expect(model.success && model.data.modelId).toBe("local/model:quantized");
  });

  it("does not route Azure without a resource URL", async () => {
    await expect(
      loadModel({ provider: "azure", model: "gpt-5.6-sol", apiKey: "key" }),
    ).rejects.toThrow("Enter a resource name");
  });
});
