import { describe, expect, it } from "vitest";
import { createQualityDecodeBudget } from "./quality-decode-budget";

describe("quality decode budget", () => {
  it("bounds concurrent and queued original decodes", async () => {
    const budget = createQualityDecodeBudget(2, 3);
    const releases: Array<() => void> = [];
    let active = 0;
    let peak = 0;
    let completed = 0;

    for (let index = 0; index < 8; index++) {
      budget.schedule(
        () =>
          new Promise<void>((resolve) => {
            active++;
            peak = Math.max(peak, active);
            releases.push(() => {
              active--;
              completed++;
              resolve();
            });
          }),
      );
    }

    expect(budget.snapshot()).toEqual({ active: 2, queued: 3 });
    while (releases.length > 0 || budget.snapshot().active > 0) {
      releases.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    }
    expect(peak).toBe(2);
    expect(completed).toBe(5);
  });
});
