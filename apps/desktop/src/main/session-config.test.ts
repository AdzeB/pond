import { describe, expect, it } from "vitest";
import { productionResponseHeaders } from "./session-config";

describe("productionResponseHeaders", () => {
  it("replaces the CSP on file:// documents without enabling cross-origin isolation", () => {
    const headers = productionResponseHeaders(
      "file:///Applications/Pond.app/Contents/Resources/app.asar/out/renderer/index.html",
      { "content-security-policy": ["default-src *"] },
    );

    expect(Object.keys(headers ?? {})).toStrictEqual([
      "Content-Security-Policy",
    ]);
  });

  it("isolates http documents", () => {
    const headers = productionResponseHeaders("https://example.com/", {
      "Content-Type": ["text/html"],
    });

    expect(headers).toMatchObject({
      "Content-Type": ["text/html"],
      "Cross-Origin-Opener-Policy": ["same-origin"],
      "Cross-Origin-Embedder-Policy": ["credentialless"],
    });
  });

  it("leaves pond:// responses untouched", () => {
    const original = { "Content-Type": ["text/html"] };

    expect(
      productionResponseHeaders("pond://archive/index.html", original),
    ).toBe(original);
  });
});
