interface HoverTarget {
  contains(other: HoverTarget | null): boolean;
}

const SETTLE_MS = 90;

/** Every crossing restarts the clock, so a sweep across a toolbar stays silent and only a settled pointer ticks. */
export function createHoverGate(settleMs = SETTLE_MS) {
  let current: HoverTarget | null = null;
  let last = Number.NEGATIVE_INFINITY;

  return {
    enter(control: HoverTarget, now: number): boolean {
      if (control === current) return false;
      const settled = now - last >= settleMs;
      current = control;
      last = now;
      return settled;
    },
    leave(control: HoverTarget, next: HoverTarget | null): void {
      if (control !== current) return;
      if (next && control.contains(next)) return;
      current = null;
    },
  };
}
