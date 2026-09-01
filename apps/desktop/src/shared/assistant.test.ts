import { describe, expect, it } from "vitest";
import { ASSISTANT_MODELS } from "./assistant";

describe("Assistant model policy", () => {
  it("uses unique provider records with explicit capabilities", () => {
    expect(new Set(ASSISTANT_MODELS.map((model) => model.id)).size).toBe(
      ASSISTANT_MODELS.length,
    );
    for (const model of ASSISTANT_MODELS) {
      expect(model.model).toBeTruthy();
      expect(model.capabilities).toEqual({
        tools: expect.any(Boolean),
        structuredOutput: expect.any(Boolean),
        vision: expect.any(Boolean),
        customModel: expect.any(Boolean),
      });
    }
  });

  it("keeps app-owned retrieval available even when a model has no tools", () => {
    expect(ASSISTANT_MODELS.some((model) => !model.capabilities.tools)).toBe(
      true,
    );
  });
});
