import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pool } from "../state/pool";
import { mutateSave, setSaveTags } from "./mutate";
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
