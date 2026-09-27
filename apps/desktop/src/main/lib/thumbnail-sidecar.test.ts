import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const paths = vi.hoisted(() => ({ root: "" }));

vi.mock("../paths", () => ({
  libraryRoot: () => paths.root,
  thumbnailCacheRoot: () => join(paths.root, ".pond", "cache", "thumbnails"),
}));

import { getOrCreateThumbnail } from "./thumbnail";

beforeEach(async () => {
  paths.root = await mkdtemp(join(tmpdir(), "pond-raw-preview-"));
});

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true });
});

it("renders an imported RAW file from its Eagle thumbnail sidecar", async () => {
  const source = join(paths.root, "sample.dng");
  await writeFile(source, Buffer.from("synthetic raw without embedded jpeg"));
  await writeFile(
    `${source}_thumbnail.png`,
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: "#4b7bec",
      },
    })
      .png()
      .toBuffer(),
  );

  const result = await getOrCreateThumbnail({
    saveId: "raw-save",
    sourcePath: source,
    width: 320,
    version: "fixture-v1",
  });

  expect(result).not.toBeNull();
  const metadata = await sharp(await readFile(result?.path ?? "")).metadata();
  expect(metadata).toMatchObject({ format: "webp", width: 320, height: 240 });
});
