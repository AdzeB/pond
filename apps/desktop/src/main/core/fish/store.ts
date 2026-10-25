import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  DEFAULT_FISH_ID,
  DEFAULT_FISH_NAME,
  FISH_COLORS,
  FISH_SPECIES,
  type Fish,
  type FishPatch,
  FishPatchSchema,
  type FishRun,
  FishSchema,
} from "../../../shared/fish-contracts";
import { readBundleJson, writeBundleJson } from "../../lib/library-config";
import { resolvePaths } from "../../paths";

function fishFile(root: string): string {
  return join(root, "fish.json");
}

function defaultFish(now: number): Fish {
  return {
    id: DEFAULT_FISH_ID,
    name: DEFAULT_FISH_NAME,
    color: "orange",
    species: "koi",
    instructions: "",
    scope: { folderIds: [], tags: [] },
    model: null,
    routine: { kind: "off" },
    lastRun: null,
    createdAt: now,
    updatedAt: now,
  };
}

function uniqueName(base: string, taken: readonly Fish[]): string {
  const names = new Set(taken.map((fish) => fish.name.toLocaleLowerCase()));
  if (!names.has(base.toLocaleLowerCase())) return base;
  let suffix = 2;
  while (names.has(`${base} ${suffix}`.toLocaleLowerCase())) suffix += 1;
  return `${base} ${suffix}`;
}

function write(root: string, school: readonly Fish[]): void {
  writeBundleJson(fishFile(root), z.array(FishSchema).parse(school));
}

/** The default fish exists in every Library, even before `fish.json` is written. */
export function listFish(
  root = resolvePaths().libraryRoot,
  now = Date.now(),
): Fish[] {
  const file = fishFile(root);
  const stored = readBundleJson<unknown>(file);
  if (!stored) {
    if (existsSync(file)) throw new Error("Your fish could not be read.");
    return [defaultFish(now)];
  }
  const school = z.array(FishSchema).parse(stored.data);
  return school.some((fish) => fish.id === DEFAULT_FISH_ID)
    ? school
    : [defaultFish(now), ...school];
}

export function readFish(
  id: string,
  root = resolvePaths().libraryRoot,
): Fish | null {
  return listFish(root).find((fish) => fish.id === id) ?? null;
}

function requireFish(school: readonly Fish[], id: string): Fish {
  const fish = school.find((entry) => entry.id === id);
  if (!fish) throw new Error("This fish no longer exists.");
  return fish;
}

export function createFish(
  patch: FishPatch,
  root = resolvePaths().libraryRoot,
  now = Date.now(),
): Fish {
  const fields = FishPatchSchema.parse(patch);
  const school = listFish(root, now);
  const used = new Set(school.map((fish) => fish.color));
  const fish = FishSchema.parse({
    id: randomUUID(),
    name: uniqueName(fields.name ?? "New Fish", school),
    color:
      fields.color ??
      FISH_COLORS.find((color) => !used.has(color)) ??
      FISH_COLORS[school.length % FISH_COLORS.length],
    species:
      fields.species ?? FISH_SPECIES[school.length % FISH_SPECIES.length],
    instructions: fields.instructions ?? "",
    scope: fields.scope ?? { folderIds: [], tags: [] },
    model: fields.model ?? null,
    routine: fields.routine ?? { kind: "off" },
    lastRun: null,
    createdAt: now,
    updatedAt: now,
  });
  write(root, [...school, fish]);
  return fish;
}

export function updateFish(
  id: string,
  patch: FishPatch,
  root = resolvePaths().libraryRoot,
  now = Date.now(),
): Fish {
  const fields = FishPatchSchema.parse(patch);
  const school = listFish(root, now);
  const next = FishSchema.parse({
    ...requireFish(school, id),
    ...fields,
    updatedAt: now,
  });
  write(
    root,
    school.map((fish) => (fish.id === id ? next : fish)),
  );
  return next;
}

export function recordFishRun(
  id: string,
  run: FishRun | null,
  root = resolvePaths().libraryRoot,
): Fish {
  const school = listFish(root);
  const next = FishSchema.parse({ ...requireFish(school, id), lastRun: run });
  write(
    root,
    school.map((fish) => (fish.id === id ? next : fish)),
  );
  return next;
}

export function markFishSeen(
  id: string,
  root = resolvePaths().libraryRoot,
): void {
  const fish = readFish(id, root);
  if (!fish?.lastRun || fish.lastRun.seen) return;
  recordFishRun(id, { ...fish.lastRun, seen: true }, root);
}

export function deleteFish(
  id: string,
  root = resolvePaths().libraryRoot,
): { ok: true } | { ok: false; error: string } {
  if (id === DEFAULT_FISH_ID)
    return { ok: false, error: "Your first fish stays in the pond." };
  const school = listFish(root);
  if (!school.some((fish) => fish.id === id))
    return { ok: false, error: "This fish no longer exists." };
  write(
    root,
    school.filter((fish) => fish.id !== id),
  );
  return { ok: true };
}
