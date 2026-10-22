import { describe, expect, it } from "vitest";
import { createHoverGate } from "./hover-gate";

interface Fake {
  contains(other: Fake | null): boolean;
}

function control(...children: Fake[]): Fake {
  const self: Fake = {
    contains: (other) =>
      other === self || (other !== null && children.includes(other)),
  };
  return self;
}

describe("createHoverGate", () => {
  it("ticks once when the pointer settles on a control", () => {
    const gate = createHoverGate();
    const button = control();
    expect(gate.enter(button, 1000)).toBe(true);
    expect(gate.enter(button, 1200)).toBe(false);
  });

  it("stays silent while the pointer sweeps across controls", () => {
    const gate = createHoverGate();
    const [a, b, c] = [control(), control(), control()];
    expect(gate.enter(a, 1000)).toBe(true);
    expect(gate.enter(b, 1040)).toBe(false);
    expect(gate.enter(c, 1080)).toBe(false);
    expect(gate.enter(a, 1300)).toBe(true);
  });

  it("does not re-tick when the pointer moves onto a child of the same control", () => {
    const gate = createHoverGate();
    const icon = control();
    const button = control(icon);
    expect(gate.enter(button, 1000)).toBe(true);
    gate.leave(button, icon);
    expect(gate.enter(button, 1500)).toBe(false);
  });

  it("ticks again after the pointer leaves and returns", () => {
    const gate = createHoverGate();
    const button = control();
    expect(gate.enter(button, 1000)).toBe(true);
    gate.leave(button, null);
    expect(gate.enter(button, 1500)).toBe(true);
  });
});
