import { describe, expect, it } from "vitest";
import {
  detachedWindowChrome,
  detachedWindowTitle,
} from "./detached-window-chrome";

describe("detached window chrome", () => {
  it("uses a frameless shadowed window with macOS rounded corners", () => {
    expect(detachedWindowChrome("darwin")).toEqual({
      frame: false,
      hasShadow: true,
      roundedCorners: true,
    });
  });

  it("keeps detached titles identifiable to the operating system", () => {
    expect(detachedWindowTitle("Settings")).toBe("Settings · Pond");
  });
});
