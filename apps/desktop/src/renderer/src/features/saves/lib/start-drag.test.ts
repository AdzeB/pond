// @vitest-environment jsdom

import { afterEach, expect, it } from "vitest";
import { selection } from "@/features/saves/state/selection";
import {
  beginSaveDrag,
  clearDraggingSaveIds,
  draggingSaveIds,
  endSaveDrag,
  isLibrarySaveDrag,
  SAVE_DRAG_TYPE,
  type SaveDragDataTransfer,
  saveDropIds,
} from "./start-drag";

afterEach(() => {
  selection.clear();
  clearDraggingSaveIds();
});

interface TestSaveDragDataTransfer extends SaveDragDataTransfer {
  readonly dragImage: Element | null;
}

function transfer(
  types: string[] = [],
  data: Record<string, string> = {},
): TestSaveDragDataTransfer {
  let dragImage: Element | null = null;
  return {
    types,
    effectAllowed: "none",
    get dragImage() {
      return dragImage;
    },
    setData(type: string, value: string) {
      data[type] = value;
      if (!types.includes(type)) types.push(type);
    },
    getData(type: string) {
      return data[type] ?? "";
    },
    setDragImage(image: Element) {
      dragImage = image;
    },
  };
}

it("marks an in-app Save drag from MIME or the live drag ids", () => {
  const data = transfer();
  expect(isLibrarySaveDrag(data)).toBe(false);
  beginSaveDrag("film", data);
  expect(data.getData(SAVE_DRAG_TYPE)).toBe("film");
  expect(isLibrarySaveDrag(data)).toBe(true);
  expect(saveDropIds(data)).toEqual(["film"]);
  expect(draggingSaveIds()).toEqual(["film"]);
});

it("reads Save ids from the MIME even after the live drag list is replaced", () => {
  const data = transfer([SAVE_DRAG_TYPE], { [SAVE_DRAG_TYPE]: "a,b" });
  expect(saveDropIds(data)).toEqual(["a", "b"]);
});

it("creates a counted drag proxy and clears the entire drag session", () => {
  selection.set(["a", "b", "c"]);
  for (const id of selection.snapshot()) {
    const card = document.createElement("li");
    card.dataset.saveId = id;
    const image = document.createElement("img");
    image.src = `https://example.com/${id}.png`;
    card.append(image);
    document.body.append(card);
  }
  const data = transfer();

  beginSaveDrag("a", data);

  expect(data.dragImage).toBeInstanceOf(HTMLElement);
  expect(data.dragImage?.textContent).toContain("3 Saves");
  expect(document.body.dataset.saveDragging).toBe("3");
  expect(document.querySelector("[data-save-drag-preview]")).not.toBeNull();

  endSaveDrag();

  expect(draggingSaveIds()).toEqual([]);
  expect(document.body.dataset.saveDragging).toBeUndefined();
  expect(document.querySelector("[data-save-drag-preview]")).toBeNull();
  document.querySelectorAll("[data-save-id]").forEach((node) => node.remove());
});

it("clears the drag session when the browser dispatches dragend", () => {
  selection.set(["a", "b"]);
  beginSaveDrag("a", transfer());

  window.dispatchEvent(new Event("dragend"));

  expect(draggingSaveIds()).toEqual([]);
  expect(document.body.dataset.saveDragging).toBeUndefined();
});
