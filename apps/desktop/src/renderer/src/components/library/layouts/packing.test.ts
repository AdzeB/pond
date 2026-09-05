import { describe, expect, it } from "vitest";
import { packGrid, packJustified, packList, packWaterfall } from "./packing";

describe("library layout packing", () => {
  it("keeps Grid slots uniform across mixed media", () => {
    const result = packGrid(["a", "b", "c"], 200, 90, 10, 20);

    expect(result.items).toEqual([
      {
        id: "a",
        top: 0,
        left: 0,
        width: 95,
        height: 115,
        mediaHeight: 95,
      },
      {
        id: "b",
        top: 0,
        left: 105,
        width: 95,
        height: 115,
        mediaHeight: 95,
      },
      {
        id: "c",
        top: 125,
        left: 0,
        width: 95,
        height: 115,
        mediaHeight: 95,
      },
    ]);
    expect(result.totalHeight).toBe(240);
  });

  it("uses the same slot contract for List rows", () => {
    expect(packList(["a", "b"], 400, 64, 48)).toEqual({
      items: [
        {
          id: "a",
          top: 0,
          left: 0,
          width: 400,
          height: 64,
          mediaHeight: 48,
        },
        {
          id: "b",
          top: 64,
          left: 0,
          width: 400,
          height: 64,
          mediaHeight: 48,
        },
      ],
      totalHeight: 128,
    });
  });

  it("places Waterfall entries in the shortest column", () => {
    const result = packWaterfall(
      [
        { id: "portrait", aspect: 0.5 },
        { id: "wide", aspect: 2 },
        { id: "square", aspect: 1 },
      ],
      200,
      90,
      10,
      20,
    );

    expect(result.items).toEqual([
      {
        id: "portrait",
        top: 0,
        left: 0,
        width: 95,
        height: 210,
        mediaHeight: 190,
      },
      {
        id: "wide",
        top: 0,
        left: 105,
        width: 95,
        height: 67.5,
        mediaHeight: 47.5,
      },
      {
        id: "square",
        top: 77.5,
        left: 105,
        width: 95,
        height: 115,
        mediaHeight: 95,
      },
    ]);
    expect(result.totalHeight).toBe(210);
  });

  it("fills complete Justified rows and leaves the final row natural", () => {
    const result = packJustified(
      [
        { id: "a", aspect: 1 },
        { id: "b", aspect: 1 },
        { id: "c", aspect: 2 },
      ],
      210,
      100,
      10,
      20,
    );

    expect(result.items).toEqual([
      {
        id: "a",
        top: 0,
        left: 0,
        width: 100,
        height: 120,
        mediaHeight: 100,
      },
      {
        id: "b",
        top: 0,
        left: 110,
        width: 100,
        height: 120,
        mediaHeight: 100,
      },
      {
        id: "c",
        top: 130,
        left: 0,
        width: 200,
        height: 120,
        mediaHeight: 100,
      },
    ]);
    expect(result.totalHeight).toBe(250);
  });
});
