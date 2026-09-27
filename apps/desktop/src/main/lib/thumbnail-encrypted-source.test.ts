import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  root: "",
  source: "",
  decryptedBytes: Buffer.alloc(0),
}));

vi.mock("../paths", () => ({
  libraryRoot: () => fixture.root,
  thumbnailCacheRoot: () => join(fixture.root, ".pond", "cache", "thumbnails"),
}));

vi.mock("../core/storage/library-media-storage", () => ({
  isEncryptedLibraryMedia: async (path: string) => path === fixture.source,
  libraryMediaMetadata: async (path: string) => ({
    originalSize: (await readFile(path)).byteLength,
  }),
  readLibraryMedia: async (path: string) => readFile(path),
  readLibraryMediaRange: vi.fn(),
  withDecryptedLibraryMediaPath: async <T>(
    _path: string,
    operation: (path: string) => Promise<T>,
  ) => {
    const temporary = join(fixture.root, "decrypted.png");
    await writeFile(temporary, fixture.decryptedBytes);
    try {
      return await operation(temporary);
    } finally {
      await rm(temporary, { force: true });
    }
  },
  writeLibraryMedia: async (path: string, bytes: Buffer) => {
    await writeFile(path, bytes);
  },
}));

import { getOrCreateThumbnail } from "./thumbnail";

beforeEach(async () => {
  fixture.root = await mkdtemp(join(tmpdir(), "pond-encrypted-preview-"));
  fixture.source = join(fixture.root, "sample.png");
  fixture.decryptedBytes = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: "#45aaf2",
    },
  })
    .png()
    .toBuffer();
  await writeFile(fixture.source, Buffer.from("encrypted-placeholder"));
});

afterEach(async () => {
  await rm(fixture.root, { recursive: true, force: true });
});

it("finishes decoding before a decrypted source is cleaned up", async () => {
  const result = await getOrCreateThumbnail({
    saveId: "encrypted-save",
    sourcePath: fixture.source,
    width: 320,
    version: "fixture-v1",
  });

  expect(result).not.toBeNull();
  const metadata = await sharp(await readFile(result?.path ?? "")).metadata();
  expect(metadata).toMatchObject({ format: "webp", width: 320, height: 240 });
});
