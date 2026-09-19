import { DEFAULT_PREFS } from "@pond/schema";
import { describe, expect, it } from "vitest";
import { processingSection } from "./config-processing";

describe("sensitive-content processing settings", () => {
  it("shows blur controls only while classification is enabled", () => {
    const blur = (processingSection.groups ?? [])
      .flatMap((group) => ("items" in group ? group.items : []))
      .find((item) => item?.key === "blurSensitiveThumbnails");
    expect(blur).toBeDefined();
    expect(blur?.visible?.(DEFAULT_PREFS.ai)).toBe(false);
    expect(
      blur?.visible?.({
        ...DEFAULT_PREFS.ai,
        enableSensitiveContent: true,
      }),
    ).toBe(true);
  });

  it("does not expose implementation model choices", () => {
    const keys = (processingSection.groups ?? []).flatMap((group) =>
      "items" in group ? (group.items ?? []).map((item) => item?.key) : [],
    );
    expect(keys).not.toContain("captionModelId");
    expect(keys).not.toContain("clipModelId");
    expect(keys).not.toContain("whisperModelId");
  });
});
