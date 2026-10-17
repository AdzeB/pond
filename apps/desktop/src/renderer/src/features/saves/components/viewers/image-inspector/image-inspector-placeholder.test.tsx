import { act } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { rememberCardThumbnail } from "@/features/saves/state/card-thumbnails";
import { setupImageInspectorTest } from "./image-inspector-test-harness";

const inspector = setupImageInspectorTest();
const ORIGINAL = "pond://test/placeholder.jpg";
const THUMBNAIL = `${ORIGINAL}?tw=512`;

/** jsdom has no image decoding, so each test settles `decode()` explicitly. */
let decodes: Array<{ resolve: () => void; reject: () => void }> = [];

beforeEach(() => {
  decodes = [];
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: () =>
      new Promise<void>((resolve, reject) => {
        decodes.push({ resolve, reject: () => reject(new Error("decode")) });
      }),
  });
});

afterEach(() => {
  Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
});

const original = () =>
  inspector.host.querySelector<HTMLImageElement>(`img[src="${ORIGINAL}"]`);
const placeholder = () =>
  inspector.host.querySelector<HTMLImageElement>(`img[src="${THUMBNAIL}"]`);

it("paints the card thumbnail until the original has decoded", async () => {
  rememberCardThumbnail(ORIGINAL, THUMBNAIL);
  await inspector.render(undefined, ORIGINAL);

  expect(placeholder()).not.toBeNull();
  expect(original()?.hasAttribute("data-pending")).toBe(true);

  await act(async () => decodes[0]?.resolve());

  expect(placeholder()).toBeNull();
  expect(original()?.hasAttribute("data-pending")).toBe(false);
});

it("reveals the original on load when decoding fails early", async () => {
  rememberCardThumbnail(ORIGINAL, THUMBNAIL);
  await inspector.render(undefined, ORIGINAL);

  await act(async () => decodes[0]?.reject());

  expect(placeholder()).not.toBeNull();
  expect(original()?.hasAttribute("data-pending")).toBe(true);

  await act(async () => original()?.dispatchEvent(new Event("load")));

  expect(placeholder()).toBeNull();
  expect(original()?.hasAttribute("data-pending")).toBe(false);
});

it("skips the placeholder when the card already showed the original", async () => {
  rememberCardThumbnail(ORIGINAL, ORIGINAL);
  await inspector.render(undefined, ORIGINAL);

  expect(
    inspector.host.querySelectorAll(`img[src="${ORIGINAL}"]`),
  ).toHaveLength(1);
});
