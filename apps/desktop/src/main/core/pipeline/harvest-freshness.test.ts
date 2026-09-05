import { describe, expect, it } from "vitest";
import { isFreshHarvest } from "./harvest-freshness";

const NOW = Date.parse("2026-08-26T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

describe("isFreshHarvest", () => {
  it("is false without a Capture or extractedAt", () => {
    expect(isFreshHarvest(null, NOW)).toBe(false);
    expect(isFreshHarvest({}, NOW)).toBe(false);
    expect(
      isFreshHarvest({ extractedAt: "2026-08-26T11:00:00.000Z" }, NOW),
    ).toBe(false);
    expect(isFreshHarvest({ capture: { media: [] } }, NOW)).toBe(false);
  });

  it("is true within 24 hours of extractedAt", () => {
    expect(
      isFreshHarvest(
        {
          capture: { media: [] },
          extractedAt: new Date(NOW - 23 * HOUR).toISOString(),
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("is false after 24 hours", () => {
    expect(
      isFreshHarvest(
        {
          capture: { media: [] },
          extractedAt: new Date(NOW - 25 * HOUR).toISOString(),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false for an unparseable extractedAt", () => {
    expect(
      isFreshHarvest(
        { capture: { media: [] }, extractedAt: "not-a-date" },
        NOW,
      ),
    ).toBe(false);
  });
});
