import { describe, expect, it } from "vitest";
import { visionEnabled } from "./vision";

describe("visionEnabled", () => {
  it("uses the resolved model's declared vision capability", () => {
    expect(
      visionEnabled({
        modelCapabilities: {
          text: true,
          vision: true,
          audio: false,
          tools: false,
        },
      }),
    ).toBe(true);
    expect(
      visionEnabled({
        modelCapabilities: {
          text: true,
          vision: false,
          audio: false,
          tools: false,
        },
      }),
    ).toBe(false);
    expect(visionEnabled(undefined)).toBe(false);
  });
});
