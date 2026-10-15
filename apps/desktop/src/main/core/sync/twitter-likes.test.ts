import { describe, expect, it } from "vitest";
import { shouldHarvestTwitterLikes } from "./twitter-likes";

const account = {
  handle: "raphael",
  sync: {},
};

describe("shouldHarvestTwitterLikes", () => {
  it("harvests likes when the account has not opted out", () => {
    expect(shouldHarvestTwitterLikes(account, false)).toBe(true);
  });

  it("skips likes when the account turns them off", () => {
    expect(
      shouldHarvestTwitterLikes(
        { ...account, sync: { syncLikes: false } },
        false,
      ),
    ).toBe(false);
  });

  it("skips likes without a handle or after cancel", () => {
    expect(shouldHarvestTwitterLikes({ ...account, handle: null }, false)).toBe(
      false,
    );
    expect(shouldHarvestTwitterLikes(account, true)).toBe(false);
  });
});
