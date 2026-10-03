import { expect, it } from "vitest";
import {
  packGrid,
  packJustified,
  packList,
  packWaterfall,
} from "@/features/library/components/layouts/packing";
import { intersectingResults, spatialNeighbor } from "./spatial-navigation";

it("moves vertically by geometry and horizontally within a regular row", () => {
  const { items } = packGrid(["a", "b", "c", "d", "e", "f"], 320, 100, 10, 0);
  expect(spatialNeighbor(items, "b", "down", 200)).toBe("e");
  expect(spatialNeighbor(items, "e", "up", 200)).toBe("b");
  expect(spatialNeighbor(items, "b", "left", 200)).toBe("a");
  expect(spatialNeighbor(items, "a", "up", 200)).toBeNull();
});

it("uses vertical neighbors and page distance in a list", () => {
  const { items } = packList(["a", "b", "c", "d", "e"], 300, 64, 48);
  expect(spatialNeighbor(items, "b", "down", 192)).toBe("c");
  expect(spatialNeighbor(items, "a", "page-down", 192)).toBe("d");
  expect(spatialNeighbor(items, "e", "page-up", 192)).toBe("b");
});

it("follows the same column despite unequal waterfall heights", () => {
  const { items } = packWaterfall(
    [
      { id: "a", aspect: 0.5 },
      { id: "b", aspect: 2 },
      { id: "c", aspect: 1 },
      { id: "d", aspect: 1 },
    ],
    210,
    100,
    10,
    0,
  );
  expect(spatialNeighbor(items, "b", "down", 200)).toBe("c");
  expect(spatialNeighbor(items, "c", "up", 200)).toBe("b");
});

it("moves between unequal justified rows and selects by rectangle intersection", () => {
  const { items } = packJustified(
    [
      { id: "a", aspect: 2 },
      { id: "b", aspect: 1 },
      { id: "c", aspect: 1 },
      { id: "d", aspect: 2 },
    ],
    310,
    100,
    10,
    0,
  );
  expect(spatialNeighbor(items, "a", "down", 200)).toBe("c");
  expect(
    intersectingResults(items, { left: 0, top: 0, width: 310, height: 100 }),
  ).toEqual(["a", "b"]);
  expect(
    intersectingResults(items, { left: 400, top: 0, width: 10, height: 10 }),
  ).toEqual([]);
});
