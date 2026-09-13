// @vitest-environment jsdom
import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { ImageInspector } from "./image-inspector";

const save: Save = {
  id: "image-inspector-test",
  source: "web",
  sourceId: "test",
  url: "https://example.test",
  title: "Reference",
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "image",
  files: [],
  tags: [],
  savedAt: 0,
  createdAt: 0,
  deletedAt: null,
  rotate: 90,
  flipX: true,
  crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.6 },
};
let host: HTMLDivElement;
let root: Root;
const tx = vi.fn(async () => ({ ok: true }));
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("pond", { query: async () => PrefsSchema.parse({}), tx });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  pool.upsert(save);
  tx.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
function button(label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find(
    (button) =>
      button.textContent === label ||
      button.getAttribute("aria-label") === label,
  );
  if (!found) throw new Error(`Missing button ${label}`);
  return found;
}
it("shows persisted transforms and keeps a cancelled crop draft out of storage", async () => {
  await act(async () =>
    root.render(
      <ImageInspector
        save={save}
        src="pond://test/reference.jpg"
        active
        onRatio={() => {}}
        onError={() => {}}
      />,
    ),
  );
  const image = host.querySelector("img");
  expect(image?.style.transform).toBe("rotate(90deg) scaleX(-1)");
  expect(image?.style.clipPath).toContain("inset(");
  const frame = image?.closest("[data-background]");
  expect(frame?.contains(button("Fit"))).toBe(false);
  expect(
    button("Fit").closest("[data-anchor]")?.getAttribute("data-anchor"),
  ).toBe("bottom-right");
  expect(
    button("Zoom In").closest("[data-anchor]")?.getAttribute("data-anchor"),
  ).toBe("top-center");
  await act(async () => button("Zoom In").click());
  expect(host.textContent).toContain("125%");
  await act(async () => button("Fit").click());
  expect(host.textContent).toContain("100%");
  await act(async () => button("Crop").click());
  expect(button("Apply Crop").disabled).toBe(true);
  expect(image?.style.transform).toBe("none");
  if (!frame) throw new Error("Missing image inspection frame");
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 400, 400),
  );
  Object.defineProperties(frame, {
    setPointerCapture: { value: () => {} },
    hasPointerCapture: { value: () => false },
  });
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
  expect(button("Apply Crop").disabled).toBe(false);
  expect(tx).not.toHaveBeenCalled();
  await act(async () => button("Cancel").click());
  expect(image?.style.transform).toBe("rotate(90deg) scaleX(-1)");
  expect(tx).not.toHaveBeenCalled();
  expect(pool.get(save.id)?.crop).toEqual(save.crop);
});

it("draws comments against original image bounds despite letterboxing and transforms", async () => {
  const source = {
    ...save,
    id: "comment-drawing",
    width: 800,
    height: 400,
    files: [
      {
        path: "reference.jpg",
        kind: "image",
        size: 1,
        sha256: "fixture",
        width: 800,
        height: 400,
        mimeType: "image/jpeg",
      },
    ],
    comments: [],
  };
  pool.upsert(source);
  await act(async () =>
    root.render(
      <ImageInspector
        save={source}
        src="pond://test/reference.jpg"
        active
        onRatio={() => {}}
        onError={() => {}}
      />,
    ),
  );
  const image = host.querySelector("img");
  const frame = image?.closest("[data-background]");
  if (!frame) throw Error("Missing frame");
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 400, 400),
  );
  Object.defineProperties(frame, {
    setPointerCapture: { value: () => {} },
    hasPointerCapture: { value: () => false },
  });
  await act(async () => button("Comment").click());
  await act(async () => {
    frame.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 100,
        clientY: 150,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: 300,
        clientY: 250,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        clientX: 300,
        clientY: 250,
      }),
    );
  });
  await act(async () => {
    frame.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        clientX: 300,
        clientY: 250,
      }),
    );
  });
  expect(host.querySelector("[data-area]")).not.toBeNull();
  const text = document.querySelector("textarea");
  if (!text) throw Error("Missing comment text");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(text, "This region");
    text.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const confirm = [...document.querySelectorAll("button")].find(
    (button) =>
      (button.textContent === "Add Comment" ||
        button.getAttribute("aria-label") === "Add Comment") &&
      !button.disabled,
  );
  await act(async () => confirm?.click());
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
  const source = {
    ...save,
    id: "comment-zoomed",
    width: 800,
    height: 400,
    files: [
      {
        path: "reference.jpg",
        kind: "image",
        size: 1,
        sha256: "fixture",
        width: 800,
        height: 400,
        mimeType: "image/jpeg",
      },
    ],
    comments: [],
  };
  pool.upsert(source);
  await act(async () =>
    root.render(
      <ImageInspector
        save={source}
        src="pond://test/zoomed.jpg"
        active
        onRatio={() => {}}
        onError={() => {}}
      />,
    ),
  );
  const image = host.querySelector("img");
  const frame = image?.closest("[data-background]");
  if (!frame) throw Error("Missing frame");
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 400, 400),
  );
  Object.defineProperties(frame, {
    setPointerCapture: { value: () => {} },
    hasPointerCapture: { value: () => false },
  });
  await act(async () => button("Zoom In").click());
  await act(async () => button("Comment").click());
  await act(async () => {
    frame.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 100,
        clientY: 150,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: 300,
        clientY: 250,
      }),
    );
    frame.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        clientX: 300,
        clientY: 250,
      }),
    );
  });
  const text = document.querySelector("textarea");
  if (!text) throw Error("Missing comment text");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(text, "Zoomed region");
    text.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const confirm = [...document.querySelectorAll("button")].find(
    (button) =>
      (button.textContent === "Add Comment" ||
        button.getAttribute("aria-label") === "Add Comment") &&
      !button.disabled,
  );
  await act(async () => confirm?.click());
  const placed = pool.get(source.id)?.comments?.[0];
  expect(placed?.text).toBe("Zoomed region");
  expect(placed?.fileIndex).toBe(0);
  expect(placed?.x).toBeCloseTo(0.3);
  expect(placed?.y).toBeCloseTo(0.3);
  expect(placed?.w).toBeCloseTo(0.4);
  expect(placed?.h).toBeCloseTo(0.4);
});

it("pins a comment on click without drawing an area", async () => {
  const source = {
    ...save,
    id: "comment-pin",
    width: 800,
    height: 400,
    files: [
      {
        path: "reference.jpg",
        kind: "image",
        size: 1,
        sha256: "fixture",
        width: 800,
        height: 400,
        mimeType: "image/jpeg",
      },
    ],
    comments: [],
  };
  pool.upsert(source);
  await act(async () =>
    root.render(
      <ImageInspector
        save={source}
        src="pond://test/reference.jpg"
        active
        onRatio={() => {}}
        onError={() => {}}
      />,
    ),
  );
  const image = host.querySelector("img");
  const frame = image?.closest("[data-background]");
  if (!frame) throw Error("Missing frame");
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 400, 400),
  );
  Object.defineProperties(frame, {
    setPointerCapture: { value: () => {} },
    hasPointerCapture: { value: () => false },
  });
  await act(async () => button("Comment").click());
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
  const text = document.querySelector("textarea");
  if (!text) throw Error("Missing comment text");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(text, "Pinned");
    text.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const confirm = [...document.querySelectorAll("button")].find(
    (button) =>
      (button.textContent === "Add Comment" ||
        button.getAttribute("aria-label") === "Add Comment") &&
      !button.disabled,
  );
  await act(async () => confirm?.click());
  expect(pool.get(source.id)?.comments?.[0]).toMatchObject({
    x: 0.5,
    y: 0.5,
    w: 0.02,
    h: 0.02,
    text: "Pinned",
    fileIndex: 0,
  });
});

async function flushPose() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
}

it("pinches to zoom at the pointer", async () => {
  await act(async () =>
    root.render(
      <ImageInspector
        save={save}
        src="pond://test/pinch.jpg"
        active
        onRatio={() => {}}
        onError={() => {}}
      />,
    ),
  );
  const frame = host.querySelector("[data-background]");
  if (!frame) throw new Error("Missing image inspection frame");
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 400, 400),
  );
  expect(host.textContent).toContain("100%");
  await act(async () => {
    frame.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -40,
        deltaMode: 0,
        clientX: 200,
        clientY: 200,
      }),
    );
  });
  await flushPose();
  expect(host.textContent).toContain("149%");
});

it("pans at fit with two-finger drag", async () => {
  await act(async () =>
    root.render(
      <ImageInspector
        save={save}
        src="pond://test/pan.jpg"
        active
        onRatio={() => {}}
        onError={() => {}}
      />,
    ),
  );
  const image = host.querySelector("img");
  const frame = image?.closest("[data-background]");
  const position = image?.parentElement?.parentElement;
  if (!frame || !position) throw new Error("Missing image inspection frame");
  expect(position.style.transform).toBe("translate(0px, 0px) scale(1)");
  await act(async () => {
    frame.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaX: 12,
        deltaY: 24,
        deltaMode: 0,
        clientX: 200,
        clientY: 200,
      }),
    );
  });
  await flushPose();
  expect(host.textContent).toContain("100%");
  expect(position.style.transform).toBe("translate(-12px, -24px) scale(1)");
});
