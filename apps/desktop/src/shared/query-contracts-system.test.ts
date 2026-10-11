import { describe, expect, it } from "vitest";
import { MediaUnderstandInputSchema } from "./query-contracts-system";

describe("media understanding query contract", () => {
  it.each(["caption", "ocr"] as const)(
    "accepts a Save ID for the %s task",
    (task) => {
      expect(
        MediaUnderstandInputSchema.parse({ saveId: "save-1", task }),
      ).toEqual({ saveId: "save-1", task });
    },
  );

  it.each([
    { saveId: "save-1", task: "caption", path: "/tmp/private.png" },
    { saveId: "save-1", task: "caption", bytes: "raw-bytes" },
    {
      saveId: "save-1",
      task: "caption",
      provider: "ollama",
      modelId: "another-model",
    },
    { saveId: "save-1", task: "caption", priority: "interactive" },
    { saveId: "save-1", task: "caption", timeoutMs: 600_000 },
    { saveId: "save-1", task: "caption", url: "https://example.com/a.png" },
  ])("rejects renderer-controlled media or model fields", (input) => {
    expect(MediaUnderstandInputSchema.safeParse(input).success).toBe(false);
  });
});
