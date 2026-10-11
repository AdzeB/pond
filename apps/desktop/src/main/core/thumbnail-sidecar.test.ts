import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, expect, it } from "vitest";
import { invalidatePaths, resolvePaths, thumbnailCacheRoot } from "../paths";
import { getOrCreateThumbnail } from "./thumbnail";

const paths = { root: "" };

beforeEach(async () => {
  paths.root = await mkdtemp(join(tmpdir(), "pond-raw-preview-"));
  resolvePaths(paths.root);
});

afterEach(async () => {
  await rm(thumbnailCacheRoot(), { recursive: true, force: true });
  invalidatePaths();
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
