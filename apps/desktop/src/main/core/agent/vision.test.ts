import { describe, expect, it } from "vitest";
import { visionEnabled } from "./vision";

describe("visionEnabled", () => {
  it("uses the dedicated vision model when set", () => {
    expect(visionEnabled("ollama", "anthropic")).toBe(true);
    expect(visionEnabled("ollama", "")).toBe(false);
  });
  it("falls back to the chat provider", () => {
    expect(visionEnabled("anthropic", undefined)).toBe(true);
    expect(visionEnabled("ollama", undefined)).toBe(false);
  });
});
