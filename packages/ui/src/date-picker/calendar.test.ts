import { describe, expect, it } from "vitest";
import {
  addMonths,
  clampDay,
  formatDay,
  localeWeekStart,
  monthGrid,
  parseDay,
} from "./calendar";

describe("calendar", () => {
  it("reads only real local days", () => {
    expect(formatDay(parseDay("2026-02-28") ?? new Date(0))).toBe("2026-02-28");
    expect(parseDay("2026-02-30")).toBeNull();
    expect(parseDay("17/10/2026")).toBeNull();
    expect(parseDay("")).toBeNull();
  });

  it("keeps the day of month when it can", () => {
    const end = parseDay("2026-01-31") ?? new Date(0);
    expect(formatDay(addMonths(end, 1))).toBe("2026-02-28");
    expect(formatDay(addMonths(end, -2))).toBe("2025-11-30");
  });

  it("lays out six weeks from the locale's first weekday", () => {
    const october = parseDay("2026-10-17") ?? new Date(0);
    const monday = monthGrid(october, 1);
    expect(monday).toHaveLength(42);
    expect(formatDay(monday[0] ?? new Date(0))).toBe("2026-09-28");
    const sunday = monthGrid(october, 0);
    expect(formatDay(sunday[0] ?? new Date(0))).toBe("2026-09-27");
  });

  it("starts the week on Monday in Britain and Sunday in the US", () => {
    expect(localeWeekStart("en-GB")).toBe(1);
    expect(localeWeekStart("en-US")).toBe(0);
  });

  it("clamps a day into range", () => {
    const min = parseDay("2026-01-01");
    const max = parseDay("2026-12-31");
    const early = parseDay("2025-06-01") ?? new Date(0);
    expect(formatDay(clampDay(early, min, max))).toBe("2026-01-01");
  });
});
