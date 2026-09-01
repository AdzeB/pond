// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomFilter } from "./custom-filter";

describe("custom filter controls", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  async function fill(index: number, value: string) {
    const input = host.querySelectorAll("input")[index];
    if (!input) throw new Error("Missing filter input");
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("includes the entire final day in a custom date range", async () => {
    const onApply = vi.fn();
    await act(async () =>
      root.render(<CustomFilter field="savedAt" onApply={onApply} />),
    );
    expect(host.querySelector("button")?.disabled).toBe(true);
    await fill(0, "2026-08-01");
    await fill(1, "2026-08-30");
    expect(host.querySelector("button")?.disabled).toBe(false);
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[type="submit"]')?.click(),
    );
    const last = new Date("2026-08-31T00:00:00");
    last.setMilliseconds(-1);
    expect(onApply).toHaveBeenCalledWith({
      field: "savedAt",
      operator: "between",
      value: [
        new Date("2026-08-01T00:00:00").toISOString(),
        last.toISOString(),
      ],
    });
  });

  it("does not apply a reversed date range", async () => {
    const onApply = vi.fn();
    await act(async () =>
      root.render(<CustomFilter field="savedAt" onApply={onApply} />),
    );
    await fill(0, "2026-08-30");
    await fill(1, "2026-08-01");
    expect(host.querySelector("button")?.disabled).toBe(true);
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[type="submit"]')?.click(),
    );
    expect(onApply).not.toHaveBeenCalled();
  });

  it("applies duration values in seconds", async () => {
    const onApply = vi.fn();
    await act(async () =>
      root.render(<CustomFilter field="duration" onApply={onApply} />),
    );
    await fill(0, "90");
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[type="submit"]')?.click(),
    );
    expect(onApply).toHaveBeenCalledWith({
      field: "duration",
      operator: "gte",
      value: 90,
    });
  });

  it("does not change a strict duration boundary when applying unchanged values", async () => {
    const onApply = vi.fn();
    const current = {
      field: "duration" as const,
      operator: "lt" as const,
      value: 30,
    };
    await act(async () =>
      root.render(
        <CustomFilter field="duration" current={current} onApply={onApply} />,
      ),
    );
    expect(host.textContent).toContain("Less Than");
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[type="submit"]')?.click(),
    );
    expect(onApply).toHaveBeenCalledWith(current);
  });
});
