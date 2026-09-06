import { describe, expect, it } from "vitest";
import {
  describeSyncSchedule,
  isSyncScheduleDue,
  type SyncSchedule,
} from "./sync-schedule";

const now = new Date(2026, 8, 7, 9, 0);
const daily: SyncSchedule = {
  enabled: true,
  intervalHours: 12,
  calendar: { kind: "daily", time: "09:00" },
};
describe("fetch schedules", () => {
  it("keeps legacy intervals and manual mode", () => {
    expect(
      isSyncScheduleDue(
        { enabled: true, intervalHours: 12 },
        now,
        +now - 12 * 3_600_000,
        0,
      ),
    ).toBe(true);
    expect(
      isSyncScheduleDue(
        { enabled: true, intervalHours: 12 },
        now,
        +now - 3_600_000,
        0,
      ),
    ).toBe(false);
    expect(isSyncScheduleDue({ ...daily, enabled: false }, now, 0, 0)).toBe(
      false,
    );
  });
  it("runs at the local deadline, once", () => {
    const before = new Date(2026, 8, 7, 8, 59);
    expect(isSyncScheduleDue(daily, before, 0, +before)).toBe(false);
    expect(isSyncScheduleDue(daily, now, 0, +before)).toBe(true);
    expect(isSyncScheduleDue(daily, now, +now, +before)).toBe(false);
  });
  it("catches a deadline crossed while asleep without replaying pre-start deadlines", () => {
    const after = new Date(2026, 8, 7, 11);
    expect(isSyncScheduleDue(daily, after, 0, +new Date(2026, 8, 7, 8))).toBe(
      true,
    );
    expect(isSyncScheduleDue(daily, after, 0, +after)).toBe(false);
  });
  it("only runs on selected weekdays", () => {
    const weekly: SyncSchedule = {
      ...daily,
      calendar: { kind: "weekly", days: [1, 3], time: "09:00" },
    };
    expect(isSyncScheduleDue(weekly, now, 0, +now - 60_000)).toBe(true);
    const tuesday = new Date(2026, 8, 8, 9);
    expect(isSyncScheduleDue(weekly, tuesday, 0, +tuesday - 60_000)).toBe(
      false,
    );
    expect(describeSyncSchedule(weekly)).toBe("Mon, Wed at 09:00");
  });
});
