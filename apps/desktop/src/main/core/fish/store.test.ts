import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { DEFAULT_FISH_ID } from "../../../shared/fish-contracts";
import {
  createFish,
  deleteFish,
  listFish,
  markFishSeen,
  recordFishRun,
  updateFish,
} from "./store";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function library(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pond-fish-"));
  roots.push(root);
  return root;
}

it("starts every Library with the default fish without writing a file", async () => {
  const root = await library();
  expect(listFish(root, 5)).toMatchObject([
    { id: DEFAULT_FISH_ID, name: "Koi", routine: { kind: "off" } },
  ]);
  await expect(readFile(join(root, "fish.json"), "utf8")).rejects.toThrow();
});

it("stores new fish in the Library with distinct names, colors, and species", async () => {
  const root = await library();
  const first = createFish({ name: "Librarian" }, root, 1);
  const second = createFish({ name: "Librarian" }, root, 2);

  expect(second.name).toBe("Librarian 2");
  expect(new Set(listFish(root).map((fish) => fish.color)).size).toBe(3);
  expect(new Set(listFish(root).map((fish) => fish.species)).size).toBe(3);
  const stored = JSON.parse(await readFile(join(root, "fish.json"), "utf8"));
  expect(stored.data.map((fish: { id: string }) => fish.id)).toEqual([
    DEFAULT_FISH_ID,
    first.id,
    second.id,
  ]);
});

it("edits a fish's fields and keeps the rest", async () => {
  const root = await library();
  const fish = createFish({ name: "Scout" }, root, 1);
  const edited = updateFish(
    fish.id,
    {
      instructions: "Watch for typography.",
      scope: { folderIds: [], tags: ["type"] },
      routine: { kind: "schedule", every: "week", task: "Sum up the week." },
    },
    root,
    9,
  );
  expect(edited).toMatchObject({
    name: "Scout",
    instructions: "Watch for typography.",
    scope: { tags: ["type"] },
    routine: { kind: "schedule", every: "week" },
    updatedAt: 9,
  });
  expect(listFish(root).find((entry) => entry.id === fish.id)).toEqual(edited);
  expect(() => updateFish(fish.id, { name: " " }, root)).toThrow();
});

it("keeps the default fish and removes others", async () => {
  const root = await library();
  const fish = createFish({}, root, 1);
  expect(deleteFish(DEFAULT_FISH_ID, root)).toMatchObject({ ok: false });
  expect(deleteFish(fish.id, root)).toEqual({ ok: true });
  expect(deleteFish(fish.id, root)).toMatchObject({ ok: false });
  expect(listFish(root).map((entry) => entry.id)).toEqual([DEFAULT_FISH_ID]);
});

it("records a routine result until it has been seen", async () => {
  const root = await library();
  recordFishRun(
    DEFAULT_FISH_ID,
    {
      chatId: "chat",
      at: 3,
      status: "done",
      changes: 2,
      seen: false,
    },
    root,
  );
  markFishSeen(DEFAULT_FISH_ID, root);
  expect(listFish(root)[0]?.lastRun).toMatchObject({ changes: 2, seen: true });
});

it("reads fish saved before species existed as koi", async () => {
  const root = await library();
  createFish({ name: "Scout", species: "shark" }, root, 1);
  const file = join(root, "fish.json");
  const stored = JSON.parse(await readFile(file, "utf8"));
  for (const fish of stored.data) delete fish.species;
  await writeFile(file, JSON.stringify(stored));
  expect(listFish(root).map((fish) => fish.species)).toEqual(["koi", "koi"]);
});

it("refuses to treat an unreadable fish file as an empty pond", async () => {
  const root = await library();
  await writeFile(join(root, "fish.json"), "{not json");
  expect(() => listFish(root)).toThrow("Your fish could not be read.");
});
