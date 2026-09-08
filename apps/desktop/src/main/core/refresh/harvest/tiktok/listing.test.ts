import { describe, expect, it } from "vitest";
import { uniqueIdFromHydration, uniqueIdFromTiktokHtml } from "./listing";

describe("uniqueIdFromHydration", () => {
  it("reads the signed-in uniqueId from app-context", () => {
    expect(
      uniqueIdFromHydration({
        __DEFAULT_SCOPE__: {
          "webapp.app-context": { user: { uniqueId: "jane.t" } },
        },
      }),
    ).toBe("jane.t");
  });

  it("reads SIGI AppContext when universal data is absent", () => {
    expect(
      uniqueIdFromHydration({
        AppContext: { user: { uniqueId: "scout2015" } },
      }),
    ).toBe("scout2015");
  });

  it("returns null when logged out", () => {
    expect(uniqueIdFromHydration({})).toBeNull();
    expect(
      uniqueIdFromHydration({
        __DEFAULT_SCOPE__: { "webapp.app-context": { user: {} } },
      }),
    ).toBeNull();
  });
});

describe("uniqueIdFromTiktokHtml", () => {
  it("parses the rehydration script tag", () => {
    const html = `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(
      {
        __DEFAULT_SCOPE__: {
          "webapp.app-context": { user: { uniqueId: "jane.t" } },
        },
      },
    )}</script></html>`;
    expect(uniqueIdFromTiktokHtml(html)).toBe("jane.t");
  });

  it("does not treat feed authors as the signed-in user", () => {
    const html = `<script id="SIGI_STATE" type="application/json">${JSON.stringify(
      {
        ItemModule: { "1": { author: { uniqueId: "someone_else" } } },
      },
    )}</script>`;
    expect(uniqueIdFromTiktokHtml(html)).toBeNull();
  });
});
