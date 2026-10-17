import { describe, expect, it } from "vitest";
import {
  importScopePatch,
  isImportPending,
  listHarvestPlan,
} from "./import-scope";

const BOARD = { id: "915", name: "Design References" };

describe("listHarvestPlan", () => {
  it("walks every list when the scope is omitted", () => {
    expect(listHarvestPlan("instagram", undefined)).toEqual({
      primary: true,
      liked: true,
      collections: null,
    });
    expect(listHarvestPlan("pinterest", undefined)).toEqual({
      primary: true,
      liked: false,
      collections: null,
    });
  });

  it("skips the saved list when you import only Likes", () => {
    expect(listHarvestPlan("instagram", { listKinds: ["liked"] })).toEqual({
      primary: false,
      liked: true,
      collections: null,
    });
  });

  it("skips Likes when you import only saved items", () => {
    expect(listHarvestPlan("youtube", { listKinds: ["saved"] })).toEqual({
      primary: true,
      liked: false,
      collections: null,
    });
  });

  it("walks chosen boards instead of every pin", () => {
    expect(listHarvestPlan("pinterest", { collections: [BOARD] })).toEqual({
      primary: false,
      liked: false,
      collections: [BOARD],
    });
  });

  it("treats an empty board list as everything rather than nothing", () => {
    expect(listHarvestPlan("pinterest", { collections: [] }).primary).toBe(
      true,
    );
  });

  it("keeps the main list for Sources without separate Likes", () => {
    expect(listHarvestPlan("tiktok", { listKinds: ["liked"] })).toEqual({
      primary: true,
      liked: false,
      collections: null,
    });
  });
});

describe("isImportPending", () => {
  it("only waits for Accounts marked pending", () => {
    expect(isImportPending({ importPending: true })).toBe(true);
    expect(isImportPending({ importPending: false })).toBe(false);
    expect(isImportPending({})).toBe(false);
  });
});

describe("importScopePatch", () => {
  it("confirms a pending Account and stores the omitted form for everything", () => {
    expect(importScopePatch({}, {})).toEqual({
      importScope: undefined,
      importPending: false,
    });
  });

  it("resets the full-walk watermark when the selection changes", () => {
    expect(importScopePatch({}, { collections: [BOARD] })).toEqual({
      importScope: { collections: [BOARD] },
      importPending: false,
      lastFullSyncAt: null,
      resumeCursor: null,
    });
  });

  it("keeps the watermark when the same selection is saved again", () => {
    const scope = {
      collections: [BOARD, { id: "88", name: "Type" }],
      listKinds: undefined,
    };
    const reordered = { collections: [{ id: "88", name: "Type" }, BOARD] };
    expect(importScopePatch({ importScope: scope }, reordered)).toEqual({
      importScope: reordered,
      importPending: false,
    });
  });

  it("treats going back to everything as a change", () => {
    expect(
      importScopePatch({ importScope: { listKinds: ["saved"] } }, {}),
    ).toMatchObject({ importScope: undefined, lastFullSyncAt: null });
  });
});
