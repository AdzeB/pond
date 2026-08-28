import { describe, expect, it } from "vitest";
import { cursorFor } from "./downloads-page";

describe("cursorFor", () => {
  it("reads the last row", () => {
    expect(cursorFor([])).toBeNull();
    expect(
      cursorFor([
        { ts: 1, id: 1 },
        { ts: 2, id: 2 },
      ]),
    ).toEqual({
      ts: 2,
      id: 2,
    });
  });
});
