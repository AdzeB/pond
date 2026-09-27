import type { ImageCrop } from "@pond/schema/db";
import { act, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import type { InspectorMode } from "./types";
import { useCropKeyboard } from "./use-crop-keyboard";

it("handles crop resizing before document hotkeys and leaves other controls alone", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const globalKey = vi.fn();
  const apply = vi.fn();
  let region: ImageCrop | null = { x: 0.1, y: 0.1, w: 0.5, h: 0.5 };
  function Fixture() {
    const frame = useRef<HTMLDivElement>(null);
    const [draft, setDraft] = useState<ImageCrop | null>({
      x: 0.1,
      y: 0.1,
      w: 0.5,
      h: 0.5,
    });
    const [mode, setMode] = useState<InspectorMode>("crop");
    region = draft;
    useCropKeyboard({
      active: true,
      draft,
      frame,
      mode,
      onApply: apply,
      ratio: 1,
      setDraft,
      setMode,
    });
    return (
      <>
        <div ref={frame} role="application" aria-label="Crop" />
        <button type="button">Outside</button>
      </>
    );
  }
  document.addEventListener("keydown", globalKey);
  try {
    await act(async () => root.render(<Fixture />));
    const frame = host.querySelector<HTMLDivElement>('[role="application"]');
    if (!frame) throw new Error("Missing crop frame");
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 100, 100),
    );
    await act(async () =>
      frame.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowUp",
          metaKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(region?.h).toBeCloseTo(0.49);
    expect(globalKey).not.toHaveBeenCalled();
    await act(async () =>
      host.querySelector("button")?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(apply).not.toHaveBeenCalled();
    expect(globalKey).toHaveBeenCalledOnce();
    await act(async () =>
      frame.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(apply).toHaveBeenCalledOnce();
    expect(globalKey).toHaveBeenCalledOnce();
  } finally {
    document.removeEventListener("keydown", globalKey);
    await act(async () => root.unmount());
    host.remove();
  }
});
