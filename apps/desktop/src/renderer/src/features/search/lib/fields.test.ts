import { FIELD_IDS } from "@pond/schema/filters/meta";
import { describe, expect, it } from "vitest";
import { fieldIcon } from "./fields";

describe("field icons", () => {
  it("uses a unique icon for every field", () => {
    const icons = FIELD_IDS.map(fieldIcon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
