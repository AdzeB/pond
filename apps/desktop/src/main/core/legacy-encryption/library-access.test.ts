import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readLibraryFileSync } from "../storage/library-file-storage";
import { readLibraryMedia } from "../storage/library-media-storage";
import fixture from "./legacy-storage-fixture.json";
import { createLegacyLibraryAccess } from "./library-access";
import {
  clearLibraryKey,
  installLibraryKey,
  libraryKeyInstalled,
} from "./library-key-runtime";

let root: string;
let keyAvailable = false;
const loadKey = vi.fn(async (libraryId: string, roots: string[] = []) => {
  installLibraryKey(libraryId, Buffer.from(fixture.masterKey, "base64"), roots);
});
const loadKeyIfAvailable = vi.fn(
  async (libraryId: string, roots: string[] = []) => {
    if (!keyAvailable) return false;
    await loadKey(libraryId, roots);
    return true;
  },
);
const prepareLegacyLibraryRead = createLegacyLibraryAccess({
  paths: () => ({
    libraryRoot: root,
    thumbnailCache: join(root, "thumbnails"),
  }),
  loadKey,
  loadKeyIfAvailable,
});

beforeEach(() => {
  keyAvailable = false;
  root = mkdtempSync(join(tmpdir(), "pond-legacy-access-"));
  writeFileSync(
    join(root, "metadata.json"),
    JSON.stringify({ id: fixture.libraryId }),
  );
});

afterEach(() => {
  clearLibraryKey();
  vi.clearAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe("legacy Library access", () => {
  it("does not install a key for a new plaintext Library", async () => {
    await prepareLegacyLibraryRead();
    expect(loadKey).not.toHaveBeenCalled();
    expect(loadKeyIfAvailable).toHaveBeenCalledOnce();
    expect(libraryKeyInstalled()).toBe(false);
  });

  it("restores encrypted media after metadata was converted to plaintext", async () => {
    keyAvailable = true;
    const item = join(root, "items", "save.info");
    mkdirSync(item, { recursive: true });
    const file = join(item, "video.mp4_thumbnail.png");
    writeFileSync(file, Buffer.from(fixture.files.media, "base64"));

    await prepareLegacyLibraryRead();

    await expect(readLibraryMedia(file)).resolves.toEqual(
      Buffer.from(fixture.mediaPlaintext),
    );
  });

  it.each(["library-security.json", ".security/encryption-migration.json"])(
    "restores encrypted metadata access with %s after index conversion",
    async (marker) => {
      mkdirSync(join(root, ".security"), { recursive: true });
      writeFileSync(join(root, marker), "{}");
      writeFileSync(join(root, "index.db"), "SQLite format 3\0");
      const file = join(root, "settings.json");
      const encrypted = Buffer.from(fixture.files.metadata, "base64");
      writeFileSync(file, encrypted);

      await prepareLegacyLibraryRead();
      expect(readLibraryFileSync(file).toString()).toBe(fixture.filePlaintext);
      clearLibraryKey();
      await prepareLegacyLibraryRead();
      expect(readLibraryFileSync(file).toString()).toBe(fixture.filePlaintext);
      expect(readFileSync(file)).toEqual(encrypted);
    },
  );

  it.each(["organization.json", "settings.json", "tags.json"])(
    "restores encrypted %s without a manifest after the index was converted",
    async (name) => {
      writeFileSync(join(root, "index.db"), "SQLite format 3\0");
      const file = join(root, name);
      const encrypted = Buffer.from(fixture.files.metadata, "base64");
      writeFileSync(file, encrypted);
      await prepareLegacyLibraryRead();
      expect(readLibraryFileSync(file).toString()).toBe(fixture.filePlaintext);
      expect(readFileSync(file)).toEqual(encrypted);
    },
  );

  it("fails before reading or overwriting metadata when the old key is missing", async () => {
    mkdirSync(join(root, ".security"));
    writeFileSync(join(root, ".security/encryption-migration.json"), "{}");
    const file = join(root, "settings.json");
    const encrypted = Buffer.from(fixture.files.metadata, "base64");
    writeFileSync(file, encrypted);
    loadKey.mockRejectedValueOnce(new Error("The Library key is unavailable."));

    await expect(prepareLegacyLibraryRead()).rejects.toThrow(
      "key is unavailable",
    );
    expect(readFileSync(file)).toEqual(encrypted);
    expect(libraryKeyInstalled()).toBe(false);
  });
});
