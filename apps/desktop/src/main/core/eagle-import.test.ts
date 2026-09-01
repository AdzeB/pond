import { describe, expect, it } from "vitest";
import { flattenEagleFolders } from "./eagle-import";

describe("flattenEagleFolders", () => {
  it("keeps nested parent ids and skips password folders", () => {
    const flat = flattenEagleFolders([
      {
        id: "root",
        name: "Photos",
        children: [
          { id: "kids", name: "Kids" },
          { id: "secret", name: "Secret", password: "x" },
        ],
      },
    ]);
    expect(flat).toEqual([
      { id: "root", name: "Photos", parentId: null, color: null },
      { id: "kids", name: "Kids", parentId: "root", color: null },
    ]);
  });
});
