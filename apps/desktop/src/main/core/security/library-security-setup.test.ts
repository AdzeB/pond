import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  decodeLibraryFile,
  isEncryptedLibraryFile,
} from "./library-file-storage";
import { clearLibraryKey, deriveLibrarySubkey } from "./library-key-runtime";
import {
  isEncryptedLibraryMedia,
  readLibraryMedia,
} from "./library-media-storage";
import { unlockLibraryWithRecoveryKey } from "./library-security";
import {
  LIBRARY_SECURITY_MANIFEST_FILENAME,
  parseLibrarySecurityManifest,
} from "./library-security-manifest";
import {
  type LibrarySecurityIndexMigration,
  type LibrarySecuritySecureStorage,
  rollbackLibrarySecuritySetup,
  setupLibrarySecurity,
} from "./library-security-setup";

const TEST_KDF = { N: 16_384, r: 8, p: 1 };
const roots: string[] = [];

class MemorySecureStorage implements LibrarySecuritySecureStorage {
  readonly values = new Map<string, string>();

  async get(account: string): Promise<string | null> {
    return this.values.get(account) ?? null;
  }

  async set(account: string, value: string): Promise<void> {
    this.values.set(account, value);
  }

  async delete(account: string): Promise<void> {
    this.values.delete(account);
  }
}

class TestIndex implements LibrarySecurityIndexMigration {
  readonly path: string;
  failRekey = false;
  failVerify = false;
  lastKey: Buffer | null = null;

  constructor(path: string) {
    this.path = path;
  }

  async checkpoint(): Promise<void> {}

  async rekey(key: Uint8Array): Promise<void> {
    if (this.failRekey) {
      this.failRekey = false;
      throw new Error("interrupted rekey");
    }
    this.lastKey = Buffer.from(key);
    await writeFile(
      this.path,
      Buffer.concat([Buffer.from("cipher:"), this.lastKey]),
    );
  }

  async verify(): Promise<void> {
    if (this.failVerify) throw new Error("index verification failed");
    const value = await readFile(this.path);
    if (!value.subarray(0, 7).equals(Buffer.from("cipher:")))
      throw new Error("index is not encrypted");
  }

  async restore(backupPath: string): Promise<void> {
    await copyFile(backupPath, this.path);
  }
}

afterEach(async () => {
  clearLibraryKey();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture() {
  const parent = await mkdtemp(join(tmpdir(), "pond-security-setup-"));
  roots.push(parent);
  const libraryRoot = join(parent, "Library.pond");
  const cacheRoot = join(parent, "cache");
  const indexPath = join(parent, "indexes", "library.db");
  const backupPath = join(parent, "security-backup");
  const item = join(libraryRoot, "items", "save.info");
  await Promise.all([
    mkdir(item, { recursive: true }),
    mkdir(join(libraryRoot, "backup"), { recursive: true }),
    mkdir(cacheRoot, { recursive: true }),
    mkdir(join(parent, "indexes"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      join(libraryRoot, "metadata.json"),
      JSON.stringify({ id: "library-id", name: "Library" }),
    ),
    writeFile(join(libraryRoot, "settings.json"), '{"theme":"dark"}'),
    writeFile(join(item, "info.json"), '{"id":"save","files":[]}'),
    writeFile(join(item, "original.bin"), Buffer.from("private original")),
    writeFile(
      join(libraryRoot, "backup", "tags.old.json"),
      '{"tags":["private"]}',
    ),
    writeFile(join(cacheRoot, "save-thumbnail.webp"), Buffer.from("thumbnail")),
    writeFile(indexPath, Buffer.from("legacy encrypted index")),
  ]);
  const secureStorage = new MemorySecureStorage();
  const index = new TestIndex(indexPath);
  return {
    parent,
    libraryRoot,
    cacheRoot,
    indexPath,
    backupPath,
    item,
    secureStorage,
    index,
    input: {
      libraryId: "library-id",
      password: "correct horse battery staple",
      libraryRoot,
      cacheRoot,
      indexPath,
      backupPath,
      passwordKdf: TEST_KDF,
      recoveryKdf: TEST_KDF,
      dependencies: { secureStorage, index },
    },
  };
}

describe("Library security setup", () => {
  it("backs up, encrypts, verifies, and publishes the manifest last", async () => {
    const setup = await fixture();
    const result = await setupLibrarySecurity(setup.input);

    const serializedManifest = await readFile(
      join(setup.libraryRoot, LIBRARY_SECURITY_MANIFEST_FILENAME),
      "utf8",
    );
    expect(parseLibrarySecurityManifest(serializedManifest)).toEqual(
      result.manifest,
    );
    expect(
      JSON.parse(
        await readFile(join(setup.libraryRoot, "metadata.json"), "utf8"),
      ),
    ).toMatchObject({ id: "library-id" });

    const settingsPath = join(setup.libraryRoot, "settings.json");
    const settings = await readFile(settingsPath);
    expect(isEncryptedLibraryFile(settings)).toBe(true);
    expect(decodeLibraryFile(settingsPath, settings).toString()).toBe(
      '{"theme":"dark"}',
    );
    expect(
      await isEncryptedLibraryMedia(join(setup.item, "original.bin")),
    ).toBe(true);
    expect(await readLibraryMedia(join(setup.item, "original.bin"))).toEqual(
      Buffer.from("private original"),
    );
    expect(
      await isEncryptedLibraryMedia(
        join(setup.cacheRoot, "save-thumbnail.webp"),
      ),
    ).toBe(true);
    expect(
      isEncryptedLibraryFile(
        await readFile(join(setup.libraryRoot, "backup", "tags.old.json")),
      ),
    ).toBe(true);

    expect(
      await readFile(
        join(result.backupPath, "library", "settings.json"),
        "utf8",
      ),
    ).toBe('{"theme":"dark"}');
    expect(
      await readFile(
        join(result.backupPath, "cache", "save-thumbnail.webp"),
        "utf8",
      ),
    ).toBe("thumbnail");
    expect(
      await readFile(join(result.backupPath, "index", "index.db"), "utf8"),
    ).toBe("legacy encrypted index");

    const expectedIndexKey = deriveLibrarySubkey("database:index");
    expect(setup.index.lastKey).toEqual(expectedIndexKey);
    expectedIndexKey.fill(0);
    const recovered = await unlockLibraryWithRecoveryKey(
      result.manifest,
      result.recoveryKey,
    );
    expect(recovered).toHaveLength(32);
    recovered.fill(0);
    expect(
      [...setup.secureStorage.values.keys()].some((key) =>
        key.startsWith("library:security-setup:"),
      ),
    ).toBe(false);
  });

  it("resumes verified work after interruption and returns one Recovery Key", async () => {
    const setup = await fixture();
    setup.index.failRekey = true;

    await expect(setupLibrarySecurity(setup.input)).rejects.toThrow(
      "interrupted rekey",
    );
    await expect(
      readFile(
        join(setup.libraryRoot, LIBRARY_SECURITY_MANIFEST_FILENAME),
        "utf8",
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await readFile(
        join(setup.backupPath, "library", "settings.json"),
        "utf8",
      ),
    ).toBe('{"theme":"dark"}');

    const resumed = await setupLibrarySecurity(setup.input);
    expect(resumed.resumed).toBe(true);
    expect(resumed.recoveryKey).toMatch(/^POND-RK1-/);
    await expect(setupLibrarySecurity(setup.input)).rejects.toThrow(
      "already set up",
    );
  });

  it("restores exact plaintext sources when rollback resumes", async () => {
    const setup = await fixture();
    setup.index.failVerify = true;

    await expect(setupLibrarySecurity(setup.input)).rejects.toThrow(
      "index verification failed",
    );
    setup.index.failVerify = false;
    await rollbackLibrarySecuritySetup({
      ...setup.input,
      reason: "Test requested rollback.",
    });

    expect(
      await readFile(join(setup.cacheRoot, "save-thumbnail.webp"), "utf8"),
    ).toBe("thumbnail");
    expect(await readFile(setup.indexPath, "utf8")).toBe(
      "legacy encrypted index",
    );
    expect(
      await readFile(join(setup.libraryRoot, "settings.json"), "utf8"),
    ).toBe('{"theme":"dark"}');
    expect(setup.secureStorage.values.size).toBe(0);
  });
});
