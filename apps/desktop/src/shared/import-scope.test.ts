import { describe, expect, it } from "vitest";
import {
  importsEverything,
  importsListKind,
  normalizeImportScope,
} from "./import-scope";

describe("normalizeImportScope", () => {
  it("collapses a full list selection to everything", () => {
    expect(
      normalizeImportScope("instagram", { listKinds: ["liked", "saved"] }),
    ).toEqual({ ok: true, scope: {} });
  });

  it("keeps a partial list selection in canonical order", () => {
    expect(
      normalizeImportScope("youtube", { listKinds: ["liked", "liked"] }),
    ).toEqual({ ok: true, scope: { listKinds: ["liked"] } });
  });

  it("rejects a selection that would import nothing", () => {
    expect(normalizeImportScope("instagram", { listKinds: [] })).toEqual({
      ok: false,
      problem: "no_lists",
    });
    expect(
      normalizeImportScope("pinterest", {
        collections: [{ id: "  ", name: "Blank" }],
      }),
    ).toEqual({ ok: false, problem: "no_collections" });
  });

  it("drops parts the Source can't honor", () => {
    expect(
      normalizeImportScope("twitter", {
        listKinds: ["saved"],
        collections: [{ id: "1", name: "Folder" }],
      }),
    ).toEqual({ ok: true, scope: {} });
    expect(normalizeImportScope("pinterest", { listKinds: ["liked"] })).toEqual(
      { ok: true, scope: {} },
    );
  });

  it("dedupes boards and falls back to the id for a blank name", () => {
    expect(
      normalizeImportScope("pinterest", {
        collections: [
          { id: "915", name: " Design " },
          { id: "915", name: "Duplicate" },
          { id: "88", name: "" },
        ],
      }),
    ).toEqual({
      ok: true,
      scope: {
        collections: [
          { id: "915", name: "Design" },
          { id: "88", name: "88" },
        ],
      },
    });
  });
});

describe("scope readers", () => {
  it("imports every list kind when no list is chosen", () => {
    expect(importsListKind(undefined, "liked")).toBe(true);
    expect(importsListKind({ listKinds: ["saved"] }, "liked")).toBe(false);
  });

  it("reports everything unless a list or board is chosen", () => {
    expect(importsEverything(undefined)).toBe(true);
    expect(importsEverything({})).toBe(true);
    expect(importsEverything({ collections: [] })).toBe(true);
    expect(importsEverything({ listKinds: ["saved"] })).toBe(false);
    expect(
      importsEverything({ collections: [{ id: "1", name: "Type" }] }),
    ).toBe(false);
  });
});
