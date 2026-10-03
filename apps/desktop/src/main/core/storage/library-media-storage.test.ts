import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import legacyFixture from "../legacy-encryption/legacy-storage-fixture.json";
import {
  clearLibraryKey,
  installLibraryKey,
} from "../legacy-encryption/library-key-runtime";
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

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pond-media-"));
  roots.push(root);
  installLibraryKey(
    legacyFixture.libraryId,
    Buffer.from(legacyFixture.masterKey, "base64"),
    root,
  );
  return root;
}

async function collect(chunks: AsyncIterable<Buffer>): Promise<Buffer> {
  const values: Buffer[] = [];
  for await (const chunk of chunks) values.push(chunk);
  return Buffer.concat(values);
}

describe("Library media storage", () => {
  it("writes plaintext with a legacy key installed and serves byte ranges", async () => {
    const root = await createRoot();
    const file = join(root, "image.bin");
    const bytes = Buffer.from(legacyFixture.mediaPlaintext);
    await writeLibraryMedia(file, bytes);
    expect(await isEncryptedLibraryMedia(file)).toBe(false);
    expect(await readFile(file)).toEqual(bytes);
    expect(await libraryMediaMetadata(file)).toEqual({
      encrypted: false,
      originalSize: bytes.byteLength,
    });
    expect(
      await collect(
        readLibraryMediaRange({ path: file, start: 7, endExclusive: 19 }),
      ),
    ).toEqual(bytes.subarray(7, 19));
    expect(await readLibraryMedia(file)).toEqual(bytes);
  });

  it("writes plaintext in configured derivative-cache roots", async () => {
    const root = await createRoot();
    const cache = await mkdtemp(join(tmpdir(), "pond-media-cache-"));
    roots.push(cache);
    installLibraryKey(
      legacyFixture.libraryId,
      Buffer.from(legacyFixture.masterKey, "base64"),
      [root, cache],
    );
    const file = join(cache, "thumb.webp");
    await writeLibraryMedia(file, Buffer.from("thumbnail"));
    expect(await isEncryptedLibraryMedia(file)).toBe(false);
    expect(await readFile(file, "utf8")).toBe("thumbnail");
  });

  it("reads legacy encrypted media and authenticated ranges", async () => {
    const root = await createRoot();
    const file = join(root, "image.bin");
    const bytes = Buffer.from(legacyFixture.mediaPlaintext);
    await writeFile(file, Buffer.from(legacyFixture.files.media, "base64"));
    expect(await isEncryptedLibraryMedia(file)).toBe(true);
    expect(await libraryMediaMetadata(file)).toEqual({
      encrypted: true,
      originalSize: bytes.byteLength,
    });
    expect(
      await collect(
        readLibraryMediaRange({ path: file, start: 7, endExclusive: 19 }),
      ),
    ).toEqual(bytes.subarray(7, 19));
    expect(await readLibraryMedia(file)).toEqual(bytes);
  });

  it("rejects tampered legacy media", async () => {
    const root = await createRoot();
    const file = join(root, "image.bin");
    const encoded = Buffer.from(legacyFixture.files.media, "base64");
    const last = encoded.byteLength - 1;
    encoded[last] = (encoded[last] ?? 0) ^ 1;
    await writeFile(file, encoded);
    await expect(readLibraryMedia(file)).rejects.toMatchObject({
      code: "AUTHENTICATION_FAILED",
    });
  });
});
