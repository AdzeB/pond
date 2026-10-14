import { describe, expect, it } from "vitest";
import { errorCopy } from "./error-copy";

const FALLBACK = "Couldn't move folders. Try again.";

describe("errorCopy", () => {
  it("shows marked copy thrown across IPC without the Electron prefix", () => {
    const error = new Error(
      "Error invoking remote method 'pond:query': PondUserError: The library is reopening. Try again when it opens.",
    );
    expect(errorCopy(error, FALLBACK)).toBe(
      "The library is reopening. Try again when it opens.",
    );
  });

  it("falls back for unmarked errors that cross IPC", () => {
    const error = new Error(
      "Error invoking remote method 'pond:query': Error: The library is reopening. Try again when it opens.",
    );
    expect(errorCopy(error, FALLBACK)).toBe(FALLBACK);
  });

  it("falls back for internal errors", () => {
    const error = new TypeError(
      "Cannot read properties of null (reading 'tags')",
    );
    expect(errorCopy(error, FALLBACK)).toBe(FALLBACK);
  });

  it("falls back for values that are not errors", () => {
    expect(errorCopy("nope", FALLBACK)).toBe(FALLBACK);
  });
});
