import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clearLibraryKey, installLibraryKey } from "./library-key-runtime";
import {
  isEncryptedLibraryMedia,
  libraryMediaMetadata,
  readLibraryMedia,
  readLibraryMediaRange,
  writeLibraryMedia,
} from "./library-media-storage";

const roots: string[] = [];

afterEach(async () => {
  clearLibraryKey();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function collect(chunks: AsyncIterable<Buffer>): Promise<Buffer> {
  const values: Buffer[] = [];
  for await (const chunk of chunks) values.push(chunk);
  return Buffer.concat(values);
}

describe("Library media storage", () => {
  it("encrypts media and serves authenticated byte ranges", async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-media-"));
    roots.push(root);
    installLibraryKey("library-id", Buffer.alloc(32, 7), root);
    const file = join(root, "image.bin");
    const bytes = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");

    await writeLibraryMedia(file, bytes);

    expect(await isEncryptedLibraryMedia(file)).toBe(true);
    expect((await readFile(file)).includes(bytes)).toBe(false);
    expect(await libraryMediaMetadata(file)).toMatchObject({
      encrypted: true,
      originalSize: bytes.byteLength,
    });
    expect(
      await collect(
        readLibraryMediaRange({
          path: file,
          start: 7,
          endExclusive: 19,
        }),
      ),
    ).toEqual(bytes.subarray(7, 19));
    expect(await readLibraryMedia(file)).toEqual(bytes);
  });

  it("encrypts configured derivative-cache roots", async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-media-"));
    const cache = await mkdtemp(join(tmpdir(), "pond-media-cache-"));
    roots.push(root, cache);
    installLibraryKey("library-id", Buffer.alloc(32, 7), [root, cache]);
    const file = join(cache, "thumb.webp");

    await writeLibraryMedia(file, Buffer.from("thumbnail"));

    expect(await isEncryptedLibraryMedia(file)).toBe(true);
  });
});
