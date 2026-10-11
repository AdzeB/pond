import type { Transaction } from "@pond/schema/tx";
import { describe, expect, it } from "vitest";
import type { LibraryIntegrityRuntime, RepairSave } from "./library-integrity";
import { createLibraryRepairService } from "./library-repairs";

function createFixture() {
  let now = 1_000;
  let libraryId = "pond-a";
  let root = "/library-a";
  const runtime: LibraryIntegrityRuntime = {
    root: () => root,
    listSaves: async () => [
      {
        id: "empty-save",
        title: "Empty Save",
        source: "web",
        sourceId: "empty",
        url: "https://example.com/empty",
        files: [],
      },
    ],
    getSave: async () => null,
    inspectPayload: async () => ({
      ok: false,
      size: null,
      sha256: null,
      reason: "missing",
    }),
    canRenderThumbnail: async () => false,
    readInfo: async () => ({ status: "missing" }),
  };
  const service = createLibraryRepairService({
    now: () => now,
    libraryId: () => libraryId,
    root: () => root,
    integrityRuntime: runtime,
    commit: async () => {},
    recordUndo: () => {},
    repairMetadata: async () => {},
  });
  return {
    service,
    advance(milliseconds: number) {
      now += milliseconds;
    },
    switchLibrary() {
      libraryId = "pond-b";
      root = "/library-b";
    },
  };
}

describe("Library repair previews", () => {
  it("expires preview tokens before apply", async () => {
    const fixture = createFixture();
    const preview = await fixture.service.preview({
      kind: "invalid-content",
    });
    fixture.advance(10 * 60_000 + 1);

    await expect(
      fixture.service.apply({ token: preview.token }),
    ).rejects.toThrow("expired");
  });

  it("binds previews to the current Pond and Library root", async () => {
    const fixture = createFixture();
    const preview = await fixture.service.preview({
      kind: "invalid-content",
    });
    fixture.switchLibrary();

    await expect(
      fixture.service.apply({ token: preview.token }),
    ).rejects.toThrow("active Library changed");
  });

  it("rejects a target that disappeared after preview", async () => {
    const fixture = createFixture();
    const preview = await fixture.service.preview({
      kind: "invalid-content",
    });

    await expect(
      fixture.service.apply({ token: preview.token }),
    ).rejects.toThrow("changed");
  });

  it("moves invalid Saves to Trash and records one Undo batch", async () => {
    const row: RepairSave = {
      id: "empty-save",
      title: "Empty Save",
      source: "web",
      sourceId: "empty",
      url: "https://example.com/empty",
      files: [],
      deletedAt: null,
    };
    const committed: Transaction[][] = [];
    const undo: Transaction[][] = [];
    const runtime: LibraryIntegrityRuntime = {
      root: () => "/library",
      listSaves: async () => [row],
      getSave: async () => row,
      inspectPayload: async () => ({
        ok: false,
        size: null,
        sha256: null,
        reason: "missing",
      }),
      canRenderThumbnail: async () => false,
      readInfo: async () => ({ status: "missing" }),
    };
    const service = createLibraryRepairService({
      now: () => 1_000,
      libraryId: () => "pond",
      root: () => "/library",
      integrityRuntime: runtime,
      commit: async (transactions) => {
        committed.push(transactions);
      },
      recordUndo: (transactions) => {
        undo.push(transactions);
      },
      repairMetadata: async () => {},
    });
    const preview = await service.preview({ kind: "invalid-content" });

    const applied = await service.apply({ token: preview.token });

    expect(committed).toMatchObject([
      [
        {
          kind: "trash",
          model: "save",
          id: "empty-save",
        },
      ],
    ]);
    expect(undo).toHaveLength(1);
    expect(applied.result).toEqual({
      repaired: 1,
      skipped: 0,
      undoRecorded: true,
    });
  });
});
