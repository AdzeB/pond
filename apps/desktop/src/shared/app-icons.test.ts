import { describe, expect, it } from "vitest";
import {
  appIconLabel,
  DEFAULT_APP_ICON,
  resolveAppIconId,
  sortAppIconIds,
} from "./app-icons";

describe("app icons", () => {
  it("labels kebab-case crayon folders", () => {
    expect(appIconLabel("aqua")).toBe("Aqua");
    expect(appIconLabel("sea-foam")).toBe("Sea Foam");
  });

  it("falls back to aqua when the stored id is missing", () => {
    const available = new Set(["aqua", "tangerine"]);
    expect(resolveAppIconId("nope", available)).toBe(DEFAULT_APP_ICON);
    expect(resolveAppIconId("tangerine", available)).toBe("tangerine");
  });

  it("keeps aqua first in the picker", () => {
    expect(sortAppIconIds(["plum", "aqua", "tangerine"])).toEqual([
      "aqua",
      "tangerine",
      "plum",
    ]);
  });
});
