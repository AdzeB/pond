import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pool } from "../state/pool";
import { bulkMutation, mutateSave, setSaveTags } from "./mutate";
import { normalise, SavePatchSchema } from "./reconcile";

beforeEach(() => {
  pool.clear();
  const save = normalise(
    SavePatchSchema.parse({
      id: "saved",
      title: "Before",
      url: "https://example.com",
      tags: ["original"],
    }),
  );
  if (!save) throw new Error("Fixture must produce a save");
  pool.upsert(save);
});
afterEach(() => {
  pool.clear();
  vi.unstubAllGlobals();
});

it("shows an edit immediately and sends its previous value for undo", async () => {
  const pending = Promise.withResolvers<void>();
  const tx = vi.fn(() => pending.promise);
  vi.stubGlobal("window", { pond: { tx } });
  const edit = mutateSave("saved", { title: "After" });
  expect(pool.get("saved")?.title).toBe("After");
  expect(tx).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "saved",
      patch: { title: "After" },
      before: { title: "Before" },
    }),
  );
  pending.resolve();
  await edit;
  expect(pool.get("saved")?.title).toBe("After");
});

it("restores tag membership when persistence rejects the edit", async () => {
  const pending = Promise.withResolvers<void>();
  const query = vi.fn(() => pending.promise);
  vi.stubGlobal("window", { pond: { query } });
  const edit = setSaveTags("saved", ["new"]);
  expect(pool.get("saved")?.tags).toEqual(["new"]);
  pending.reject(new Error("Library unavailable"));
  await edit;
  expect(pool.get("saved")?.tags).toEqual(["original"]);
  expect(query).toHaveBeenCalledWith("tags.setForSave", {
    saveId: "saved",
    tags: ["new"],
  });
});

it("retains cold IDs for trash, restore, and purge beyond the loaded page", async () => {
  const ids = [
    "saved",
    ...Array.from({ length: 300 }, (_, index) => `cold-${index}`),
  ];
  const query = vi.fn(async () => ({ changed: ids.length }));
  vi.stubGlobal("window", { pond: { query } });
  const { trashSaves, untrashSaves, purgeSaves } = await import("./mutate");
  expect(await trashSaves(ids)).toBe(ids.length);
  expect(await untrashSaves(ids)).toBe(ids.length);
  expect(await purgeSaves(ids)).toBe(ids.length);
  expect(query.mock.calls).toEqual([
    ["saves.bulkEdit", { ids, operation: { kind: "trash" } }],
    ["feedback.emit", { event: "saveDeletion" }],
    ["saves.bulkEdit", { ids, operation: { kind: "untrash" } }],
    ["saves.bulkEdit", { ids, operation: { kind: "purge" } }],
    ["feedback.emit", { event: "saveDeletion" }],
  ]);
});

it("clears loaded tags optimistically for a replace operation", async () => {
  const pending = Promise.withResolvers<{ changed: number }>();
  const query = vi.fn(() => pending.promise);
  vi.stubGlobal("window", { pond: { query } });
  const edit = bulkMutation(["saved"], {
    kind: "tags",
    tags: [],
    mode: "replace",
  });
  expect(pool.get("saved")?.tags).toEqual([]);
  pending.resolve({ changed: 1 });
  await edit;
  expect(query).toHaveBeenCalledWith("saves.bulkEdit", {
    ids: ["saved"],
    operation: { kind: "tags", tags: [], mode: "replace" },
  });
});
