import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { listRecentLibraries, recordRecentLibrary } from "./recent-libraries";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("keeps recent libraries in open order and marks unavailable libraries without forgetting them", async () => {
  const root = await mkdtemp(join(tmpdir(), "pond-recent-"));
  roots.push(root);
  const active = join(root, "Active.pond");
  await mkdir(active);
  await writeFile(join(active, "metadata.json"), "{}");
  const absent = join(root, "Offline.pond");
  const file = join(root, "recent.json");
  recordRecentLibrary(file, active, 1);
  recordRecentLibrary(file, absent, 2);
  recordRecentLibrary(file, active, 3);
  expect(await listRecentLibraries(file, active)).toEqual([
    {
      path: active,
      lastOpened: 3,
      name: "Active",
      active: true,
      available: true,
    },
    {
      path: absent,
      lastOpened: 2,
      name: "Offline",
      active: false,
      available: false,
    },
  ]);
});
