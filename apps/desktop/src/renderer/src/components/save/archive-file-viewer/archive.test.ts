import { describe, expect, it } from "vitest";
import { archiveSafety } from "./archive";

describe("archiveSafety", () => {
  it("accepts a bounded ZIP archive", () => {
    expect(
      archiveSafety({ entries: 3, compressed: 2, uncompressed: 3 }),
    ).toEqual({ safe: true, reason: null });
  });

  it.each([
    [{ entries: 10_001, compressed: 2, uncompressed: 3 }, "too many entries"],
    [
      { entries: 3, compressed: 251 * 1024 ** 2, uncompressed: 3 },
      "archive is too large",
    ],
    [
      { entries: 3, compressed: 2, uncompressed: 1024 ** 3 + 1 },
      "expanded content is too large",
    ],
  ])("rejects unsafe archive bounds", (input, reason) => {
    expect(archiveSafety(input)).toEqual({ safe: false, reason });
  });
});
