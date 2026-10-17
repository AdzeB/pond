import { act } from "react";
import { expect, it } from "vitest";
import { viewerEscape } from "@/features/saves/state/viewer-escape";
import { setupImageInspectorTest } from "./image-inspector-test-harness";

const inspector = setupImageInspectorTest();

async function dragCrop(frame: Element) {
  await act(async () => {
    frame.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 40,
        clientY: 40,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: 240,
        clientY: 240,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        clientX: 240,
        clientY: 240,
      }),
    );
  });
}

it("lets the first Esc cancel crop mode wherever focus is, and the next one fall through", async () => {
  await inspector.render();
  await act(async () => inspector.button("Crop").click());
  const frame = inspector.prepareFrame();
  expect(frame.getAttribute("data-mode")).toBe("crop");
  inspector.button("Cancel").focus();

  let cancelled = false;
  await act(async () => {
    cancelled = viewerEscape.cancel();
  });
  expect(cancelled).toBe(true);
  expect(frame.getAttribute("data-mode")).toBe("view");
  expect(document.activeElement).toBe(frame);
  expect(viewerEscape.cancel()).toBe(false);
});

it("returns focus to the image after Apply Crop so Esc can close the save", async () => {
  await inspector.render();
  await act(async () => inspector.button("Crop").click());
  const frame = inspector.prepareFrame();
  await dragCrop(frame);
  const apply = inspector.button("Apply Crop");
  apply.focus();
  await act(async () => apply.click());

  expect(inspector.tx).toHaveBeenCalled();
  expect(frame.getAttribute("data-mode")).toBe("view");
  expect(document.activeElement).toBe(frame);
  expect(viewerEscape.cancel()).toBe(false);
});
