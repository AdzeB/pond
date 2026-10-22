import { describe, expect, it } from "vitest";
import { shouldAskForSupport } from "./eligibility";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 22);

describe("shouldAskForSupport", () => {
  it("asks once a library is established and has been in use for two weeks", () => {
    expect(
      shouldAskForSupport({ saves: 500, firstSeenAt: now - 14 * DAY, now }),
    ).toBe(true);
  });

  it("waits for more saves", () => {
    expect(
      shouldAskForSupport({ saves: 499, firstSeenAt: now - 90 * DAY, now }),
    ).toBe(false);
  });

  it("waits after a large first import", () => {
    expect(
      shouldAskForSupport({ saves: 20_000, firstSeenAt: now - 2 * DAY, now }),
    ).toBe(false);
  });
});
