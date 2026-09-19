import { describe, expect, it } from "vitest";
import { searchSection } from "./config-search";

describe("search settings", () => {
  it("does not expose the embedding implementation", () => {
    const keys = (searchSection.groups ?? []).flatMap((group) =>
      "items" in group ? (group.items ?? []).map((item) => item?.key) : [],
    );
    expect(keys).not.toContain("embedModelId");
  });
});
