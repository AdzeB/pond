import { afterEach, expect, it } from "vitest";
import { selection } from "@/features/saves/state/selection";
import {
  beginSaveDrag,
  clearDraggingSaveIds,
  draggingSaveIds,
  isLibrarySaveDrag,
  SAVE_DRAG_TYPE,
  type SaveDragDataTransfer,
  saveDropIds,
} from "./start-drag";

afterEach(() => {
  selection.clear();
  clearDraggingSaveIds();
});

function transfer(types: string[] = [], data: Record<string, string> = {}) {
  return {
    types,
    effectAllowed: "none",
    setData(type: string, value: string) {
      data[type] = value;
      if (!types.includes(type)) types.push(type);
    },
    getData(type: string) {
      return data[type] ?? "";
    },
  } satisfies SaveDragDataTransfer;
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
