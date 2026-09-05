// @vitest-environment jsdom
import { act, type CSSProperties, useCallback, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Window } from "../../../packages/ui/src/window";

describe("sidebar resize handle", () => {
  let container: HTMLDivElement;
  let root: Root;
  const resized = vi.fn();
  const collapsed = vi.fn();

  function Fixture() {
    const [open, setOpen] = useState(true);
    const [width, setWidth] = useState(300);
    const resize = useCallback((next: number) => {
      resized(next);
      setWidth(next);
    }, []);
    const collapse = useCallback(() => {
      collapsed();
      setOpen(false);
    }, []);
    const style: CSSProperties & { "--window-left-track": string } = {
      "--window-left-track": `${width}px`,
    };
    return (
      <Window.Root leftOpen={open} style={style}>
        <Window.Left
          open={open}
          minWidth={220}
          maxWidth={420}
          onResize={resize}
          onCollapse={collapse}
        >
          Sidebar
        </Window.Left>
        <Window.Center>
          <button type="button" onClick={() => setOpen(true)}>
            Reopen
          </button>
        </Window.Center>
      </Window.Root>
    );
  }

  function element(selector: string) {
    const node = container.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`Missing ${selector}`);
    return node;
  }

  async function pointer(target: HTMLElement, type: string, clientX: number) {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX });
    Object.defineProperty(event, "pointerId", { value: 1 });
    await act(() => target.dispatchEvent(event));
  }

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    resized.mockClear();
    collapsed.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const shell = this.closest<HTMLElement>('[data-slot="window"]');
        const width = Number.parseFloat(
          shell?.style.getPropertyValue("--window-left-track") ?? "300",
        );
        return new DOMRect(0, 0, width, 600);
      },
    );
    await act(() => root.render(<Fixture />));
    Object.defineProperties(element('[data-slot="handle"]'), {
      setPointerCapture: { value: vi.fn(), configurable: true },
      releasePointerCapture: { value: vi.fn(), configurable: true },
    });
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("commits a normal resize above the minimum", async () => {
    const handle = element('[data-slot="handle"]');
    await pointer(handle, "pointerdown", 300);
    await pointer(handle, "pointermove", 250);
    expect(resized).not.toHaveBeenCalled();
    expect(
      element('[data-slot="window"]').style.getPropertyValue(
        "--window-left-track",
      ),
    ).toBe("250px");
    await pointer(handle, "pointerup", 250);
    expect(resized).toHaveBeenCalledWith(250);
    expect(collapsed).not.toHaveBeenCalled();
  });

  it("closes at the minimum before release and reopens at the saved width", async () => {
    const handle = element('[data-slot="handle"]');
    await pointer(handle, "pointerdown", 300);
    await pointer(handle, "pointermove", 221);
    await pointer(handle, "pointermove", 220);
    expect(collapsed).toHaveBeenCalledTimes(1);
    expect(element('[data-slot="window"]').hasAttribute("data-left-open")).toBe(
      false,
    );
    expect(
      element('[data-slot="window"]').style.getPropertyValue(
        "--window-left-track",
      ),
    ).toBe("300px");
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
    expect(element('[data-slot="window"]').hasAttribute("data-resizing")).toBe(
      false,
    );
    await pointer(handle, "pointermove", 100);
    await pointer(handle, "pointerup", 100);
    expect(collapsed).toHaveBeenCalledTimes(1);
    expect(resized).not.toHaveBeenCalled();
    await act(() => element("button").click());
    expect(element('[data-slot="window"]').hasAttribute("data-left-open")).toBe(
      true,
    );
    expect(
      element('[data-slot="window"]').style.getPropertyValue(
        "--window-left-track",
      ),
    ).toBe("300px");
  });

  it.each([
    "pointercancel",
    "lostpointercapture",
  ])("cancels safely on %s", async (type) => {
    const handle = element('[data-slot="handle"]');
    await pointer(handle, "pointerdown", 300);
    await pointer(handle, "pointermove", 250);
    await pointer(handle, type, 250);
    expect(resized).not.toHaveBeenCalled();
    expect(collapsed).not.toHaveBeenCalled();
    expect(
      element('[data-slot="window"]').style.getPropertyValue(
        "--window-left-track",
      ),
    ).toBe("300px");
    expect(document.body.style.cursor).toBe("");
    expect(element('[data-slot="window"]').hasAttribute("data-resizing")).toBe(
      false,
    );
  });

  it("still collapses on a click without dragging", async () => {
    const handle = element('[data-slot="handle"]');
    await pointer(handle, "pointerdown", 300);
    await pointer(handle, "pointerup", 300);
    expect(collapsed).toHaveBeenCalledTimes(1);
    expect(resized).not.toHaveBeenCalled();
  });
});
