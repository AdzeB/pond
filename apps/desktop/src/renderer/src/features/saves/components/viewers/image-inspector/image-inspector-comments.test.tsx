import { act } from "react";
import { expect, it, vi } from "vitest";
import { pool } from "@/features/saves/state/pool";
import {
  commentSave,
  setupImageInspectorTest,
} from "./image-inspector-test-harness";

const inspector = setupImageInspectorTest();

async function drawComment(
  frame: Element,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  await act(async () => {
    frame.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: start.x,
        clientY: start.y,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: end.x,
        clientY: end.y,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        clientX: end.x,
        clientY: end.y,
      }),
    );
  });
}

it("draws comments against original image bounds despite letterboxing and transforms", async () => {
  const source = commentSave("comment-drawing");
  await inspector.render(source);
  const frame = inspector.prepareFrame();
  await act(async () => inspector.button("Comment").click());
  await drawComment(frame, { x: 100, y: 150 }, { x: 300, y: 250 });
  await act(async () => {
    frame.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        clientX: 300,
        clientY: 250,
      }),
    );
  });
  expect(inspector.host.querySelector("[data-area]")).not.toBeNull();
  await inspector.submitComment("This region");
  expect(pool.get(source.id)?.comments?.[0]).toMatchObject({
    x: 0.25,
    y: 0.25,
    w: 0.5,
    h: 0.5,
    text: "This region",
    fileIndex: 0,
  });
  expect(pool.get(source.id)).toMatchObject({
    rotate: 90,
    flipX: true,
    crop: source.crop,
  });
});

it("places a zoomed comment on the pixels under the pointer", async () => {
  const source = commentSave("comment-zoomed");
  await inspector.render(source, "pond://test/zoomed.jpg");
  const frame = inspector.prepareFrame();
  await act(async () => inspector.button("Zoom In").click());
  await act(async () => inspector.button("Comment").click());
  await drawComment(frame, { x: 100, y: 150 }, { x: 300, y: 250 });
  await inspector.submitComment("Zoomed region");
  const placed = pool.get(source.id)?.comments?.[0];
  expect(placed?.text).toBe("Zoomed region");
  expect(placed?.fileIndex).toBe(0);
  expect(placed?.x).toBeCloseTo(0.3);
  expect(placed?.y).toBeCloseTo(0.3);
  expect(placed?.w).toBeCloseTo(0.4);
  expect(placed?.h).toBeCloseTo(0.4);
});

it("pins a comment on click without drawing an area", async () => {
  const source = commentSave("comment-pin");
  await inspector.render(source);
  const frame = inspector.prepareFrame();
  await act(async () => inspector.button("Comment").click());
  await act(async () => {
    frame.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 200,
        clientY: 200,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        button: 0,
        clientX: 200,
        clientY: 200,
      }),
    );
  });
  await inspector.submitComment("Pinned");
  expect(pool.get(source.id)?.comments?.[0]).toMatchObject({
    x: 0.5,
    y: 0.5,
    w: 0.02,
    h: 0.02,
    text: "Pinned",
    fileIndex: 0,
  });
  expect(pool.get(source.id)?.comments?.[0]?.createdAt).toEqual(
    expect.any(Number),
  );
});

it("anchors the comment editor to the selected region", async () => {
  const source = commentSave("comment-anchor", [
    {
      id: "region",
      x: 0.2,
      y: 0.1,
      w: 0.4,
      h: 0.5,
      text: "Region note",
      fileIndex: 0,
    },
  ]);
  await inspector.render(source, "pond://test/anchor.jpg");
  await act(async () => inspector.button("Comment").click());
  const region = inspector.host.querySelector("[data-area]");
  const pin = inspector.host.querySelector("[data-area] button");
  if (!(region instanceof HTMLElement) || !(pin instanceof HTMLElement))
    throw new Error("Missing comment region");
  vi.spyOn(region, "getBoundingClientRect").mockReturnValue(
    new DOMRect(40, 80, 200, 160),
  );
  vi.spyOn(pin, "getBoundingClientRect").mockReturnValue(
    new DOMRect(30, 70, 20, 20),
  );
  await act(async () => pin.click());
  const positioner = document.querySelector("[data-type='popover']");
  if (!(positioner instanceof HTMLElement))
    throw new Error("Missing comment editor");
  expect(positioner.style.getPropertyValue("--anchor-width")).toBe("200px");
});
