import { sensitiveContentBand } from "@pond/schema/content-safety";
import { describe, expect, it } from "vitest";

describe("sensitive content bands", () => {
  it("maps scores without discarding model confidence", () => {
    expect(sensitiveContentBand(null)).toBe("not-checked");
    expect(sensitiveContentBand(0.49)).toBe("not-sensitive");
    expect(sensitiveContentBand(0.5)).toBe("possible-sensitive");
    expect(sensitiveContentBand(0.8)).toBe("likely-sensitive");
  });

  it("treats invalid scores as unchecked", () => {
    expect(sensitiveContentBand(Number.NaN)).toBe("not-checked");
    expect(sensitiveContentBand(-1)).toBe("not-checked");
    expect(sensitiveContentBand(2)).toBe("not-checked");
  });
});
